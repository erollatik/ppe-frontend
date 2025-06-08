import { fetchDetection, detectPPE, uploadImageForDetection } from './api.js';

export const ppeAPI = {
    // PPE monitoring başlat
    async startMonitoring() {
        try {
            const response = await api.post('/ppe/start');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Monitoring başlatılamadı');
        }
    },
    
    // PPE monitoring durdur
    async stopMonitoring() {
        try {
            const response = await api.post('/ppe/stop');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Monitoring durdurulamadı');
        }
    },
    
    // Son tespitleri al
    async getDetections() {
        try {
            const response = await api.get('/ppe/detections');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Tespit verileri alınamadı');
        }
    },
    
    // İstatistikleri al
    async getStats() {
        try {
            const response = await api.get('/ppe/stats');
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'İstatistik verileri alınamadı');
        }
    },
    
    // Kamera stream URL'i
    getCameraStreamUrl() {
        return `${import.meta.env.VITE_API_BASE_URL}/ppe/camera/stream`;
    }
};

export const ppeService = {
    async detectPPE(imageData) {
      try {
        const response = await fetch(`${API_BASE_URL}/detect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData })
        });
        return await response.json();
      } catch (error) {
        console.error('PPE Detection Error:', error);
        throw error;
      }
    }
};
  