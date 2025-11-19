import React, { useRef, useState, useCallback } from 'react';
import './Camera.css';

const Camera = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState('');

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

    const takePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL and add to photos
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhotos(prev => [...prev, {
            id: Date.now(),
            data: photoData,
            timestamp: new Date().toLocaleString()
        }]);
    }, []);

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

            {error && (
                <div className="error-message">
                    {error}
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
                    disabled={!stream}
                    className="btn btn-capture"
                >
                    📸 Take Photo
                </button>
                <button
                    onClick={stopCamera}
                    disabled={!stream}
                    className="btn btn-secondary"
                >
                    ⏹️ Stop Camera
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
                        <button onClick={clearPhotos} className="btn btn-clear">
                            🗑️ Clear All
                        </button>
                    </div>
                    <div className="photos-grid">
                        {photos.map((photo) => (
                            <div key={photo.id} className="photo-item">
                                <img src={photo.data} alt={`Capture ${photo.id}`} />
                                <div className="photo-actions">
                                    <button
                                        onClick={() => downloadPhoto(photo.data, `photo-${photo.id}.jpg`)}
                                        className="btn btn-download"
                                    >
                                        ⬇️ Download
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