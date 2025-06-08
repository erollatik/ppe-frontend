// API Base URL
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:8081/api';

// Generic API call function
async function apiCall(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Error for ${endpoint}:`, error);
        throw error;
    }
}

// Detection API
export async function fetchDetection() {
    return await apiCall('/detection');
}

// Health Check
export async function checkHealth() {
    return await apiCall('/health');
}

// PPE Detection
export async function detectPPE(imageData) {
    return await apiCall('/detect', {
        method: 'POST',
        body: JSON.stringify({ image: imageData })
    });
}

// Image Upload for PPE Detection
export async function uploadImageForDetection(formData) {
    return await apiCall('/detect/upload', {
        method: 'POST',
        headers: {}, // FormData için Content-Type otomatik
        body: formData
    });
}

// Export API base URL for other services
export { API_BASE_URL };
export default {
  fetchDetection,
  checkHealth,
  detectPPE,
  uploadImageForDetection
};