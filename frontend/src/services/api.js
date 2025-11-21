import axios from 'axios';

// Use local backend during development
const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

export const apiService = {
    // Health check
    healthCheck: () => api.get('/health'),

    // Get all photos
    getPhotos: () => api.get('/photos'),

    // Upload photo
    uploadPhoto: (photoBlob, filename = 'photo.jpg') => {
        const formData = new FormData();
        formData.append('photo', photoBlob, filename);
        return api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Delete photo
    deletePhoto: (id) => api.delete(`/photos/${id}`),

    // Get server info
    getServerInfo: () => api.get('/info'),
};

export default apiService;