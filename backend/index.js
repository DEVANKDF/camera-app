import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSuffix + '.jpg');
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// In-memory storage for demo (use database in production)
let photos = [];

// Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Get all photos
app.get('/api/photos', (req, res) => {
    res.json({
        success: true,
        count: photos.length,
        photos: photos.map(photo => ({
            id: photo.id,
            filename: photo.filename,
            originalName: photo.originalName,
            url: `/api/photos/${photo.filename}`,
            timestamp: photo.timestamp
        }))
    });
});

// Upload photo
app.post('/api/upload', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const photoData = {
            id: Date.now(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            timestamp: new Date().toISOString()
        };

        photos.push(photoData);

        res.json({
            success: true,
            message: 'Photo uploaded successfully',
            photo: {
                id: photoData.id,
                filename: photoData.filename,
                url: `/api/photos/${photoData.filename}`,
                timestamp: photoData.timestamp
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Upload failed: ' + error.message
        });
    }
});

// Serve uploaded photos
app.get('/api/photos/:filename', (req, res) => {
    const filename = req.params.filename;
    const photoPath = path.join(uploadsDir, filename);

    if (fs.existsSync(photoPath)) {
        res.sendFile(photoPath);
    } else {
        res.status(404).json({
            success: false,
            message: 'Photo not found'
        });
    }
});

// Delete photo
app.delete('/api/photos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const photoIndex = photos.findIndex(photo => photo.id === id);

    if (photoIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Photo not found'
        });
    }

    const photo = photos[photoIndex];

    // Delete file from filesystem
    try {
        if (fs.existsSync(photo.path)) {
            fs.unlinkSync(photo.path);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }

    // Remove from memory
    photos.splice(photoIndex, 1);

    res.json({
        success: true,
        message: 'Photo deleted successfully'
    });
});

// Get server info
app.get('/api/info', (req, res) => {
    res.json({
        success: true,
        data: {
            server: 'Camera App Backend',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uploadsDirectory: uploadsDir,
            totalPhotos: photos.length,
            maxFileSize: '10MB'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    res.status(500).json({
        success: false,
        message: error.message
    });
});

// FIXED: 404 handler - use a proper route pattern
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});