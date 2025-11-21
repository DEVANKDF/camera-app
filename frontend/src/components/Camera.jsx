import React, { useRef, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import './Camera.css';

const Camera = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [serverStatus, setServerStatus] = useState('checking');

    // Check server status on component mount
    React.useEffect(() => {
        checkServerStatus();
    }, []);

    const checkServerStatus = async () => {
        try {
            await apiService.healthCheck();
            setServerStatus('online');
        } catch (err) {
            setServerStatus('offline');
            setError('Backend server is offline. Please make sure the backend is running on port 3001.');
        }
    };

    const startCamera = useCallback(async () => {
        try {
            setError('');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment'
                }
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setError(`Cannot access camera: ${err.message}`);
            console.error('Camera error:', err);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    }, [stream]);

    const takePhoto = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL for immediate display
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Create a temporary photo object for immediate display
        const tempPhoto = {
            id: `temp-${Date.now()}`,
            data: photoDataUrl,
            timestamp: new Date().toLocaleString(),
            isUploading: true
        };

        setPhotos(prev => [tempPhoto, ...prev]);

        // Convert canvas to blob for upload
        canvas.toBlob(async (blob) => {
            await uploadPhotoToServer(blob, tempPhoto.id);
        }, 'image/jpeg', 0.8);
    }, []);

    const uploadPhotoToServer = async (blob, tempId) => {
        try {
            setUploading(true);

            const response = await apiService.uploadPhoto(blob, `photo-${Date.now()}.jpg`);

            // Update the photo with server data
            setPhotos(prev => prev.map(photo =>
                photo.id === tempId
                    ? {
                        ...photo,
                        id: response.data.photo.id,
                        serverId: response.data.photo.id,
                        url: response.data.photo.url,
                        isUploading: false
                    }
                    : photo
            ));

            console.log('Photo uploaded successfully:', response.data);
        } catch (error) {
            console.error('Upload failed:', error);
            setError('Failed to upload photo to server');

            // Mark upload as failed
            setPhotos(prev => prev.map(photo =>
                photo.id === tempId
                    ? { ...photo, uploadFailed: true, isUploading: false }
                    : photo
            ));
        } finally {
            setUploading(false);
        }
    };

    const loadPhotosFromServer = async () => {
        try {
            const response = await apiService.getPhotos();
            // Convert server photos to local format
            const serverPhotos = response.data.photos.map(photo => ({
                id: photo.id,
                serverId: photo.id,
                url: `http://localhost:3001${photo.url}`,
                timestamp: new Date(photo.timestamp).toLocaleString(),
                filename: photo.filename
            }));
            setPhotos(serverPhotos);
        } catch (error) {
            console.error('Failed to load photos:', error);
        }
    };

    const deletePhoto = async (photoId) => {
        try {
            // If it's a server photo, delete from server
            if (photos.find(p => p.id === photoId)?.serverId) {
                await apiService.deletePhoto(photoId);
            }

            // Remove from local state
            setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        } catch (error) {
            console.error('Delete failed:', error);
            setError('Failed to delete photo');
        }
    };

    const downloadPhoto = (photoData, filename = 'photo.jpg') => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = photoData;
        link.click();
    };

    const clearPhotos = () => {
        setPhotos([]);
    };

    return (
        <div className="camera-container">
            <h2>📷 Camera App</h2>

            {/* Server Status Indicator */}
            <div className={`server-status ${serverStatus}`}>
                Backend Server: {serverStatus === 'online' ? '✅ Online' : '❌ Offline'}
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="close-error">×</button>
                </div>
            )}

            <div className="camera-controls">
                <button
                    onClick={startCamera}
                    disabled={stream}
                    className="btn btn-primary"
                >
                    🎥 Start Camera
                </button>
                <button
                    onClick={takePhoto}
                    disabled={!stream || uploading}
                    className="btn btn-capture"
                >
                    {uploading ? '📤 Uploading...' : '📸 Take Photo'}
                </button>
                <button
                    onClick={stopCamera}
                    disabled={!stream}
                    className="btn btn-secondary"
                >
                    ⏹️ Stop Camera
                </button>
                <button
                    onClick={loadPhotosFromServer}
                    className="btn btn-load"
                >
                    🔄 Load Photos
                </button>
            </div>

            <div className="camera-preview">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`video-element ${stream ? 'active' : ''}`}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {!stream && (
                    <div className="camera-placeholder">
                        <p>Click "Start Camera" to begin</p>
                    </div>
                )}
            </div>

            {photos.length > 0 && (
                <div className="photo-section">
                    <div className="photo-header">
                        <h3>Your Photos ({photos.length})</h3>
                        <div>
                            <button onClick={loadPhotosFromServer} className="btn btn-load">
                                🔄 Refresh
                            </button>
                            <button onClick={clearPhotos} className="btn btn-clear">
                                🗑️ Clear All
                            </button>
                        </div>
                    </div>
                    <div className="photos-grid">
                        {photos.map((photo) => (
                            <div key={photo.id} className="photo-item">
                                <img
                                    src={photo.url || photo.data}
                                    alt={`Capture ${photo.id}`}
                                    className={photo.isUploading ? 'uploading' : ''}
                                />
                                <div className="photo-status">
                                    {photo.isUploading && <span className="uploading-text">Uploading...</span>}
                                    {photo.uploadFailed && <span className="failed-text">Upload Failed</span>}
                                </div>
                                <div className="photo-actions">
                                    <button
                                        onClick={() => downloadPhoto(photo.url || photo.data, `photo-${photo.id}.jpg`)}
                                        className="btn btn-download"
                                    >
                                        ⬇️ Download
                                    </button>
                                    <button
                                        onClick={() => deletePhoto(photo.id)}
                                        className="btn btn-delete"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                                <span className="photo-time">{photo.timestamp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Camera;