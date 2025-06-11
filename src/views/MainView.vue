<template>
  <div class="main-container">
    <!-- Durum Çubuğu -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">🔗 Bağlantı:</span>
        <span :class="['status-value', connectionStatus]">
          {{ connectionStatusText }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-label">👥 Aktif Çalışan:</span>
        <span class="status-value">{{ activeWorkerCount }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">⚠️ Bugünkü İhlaller:</span>
        <span class="status-value">{{ todayViolations }}</span>
      </div>
    </div>

    <!-- Ana İçerik -->
    <div class="content-grid">
      <!-- Sol Panel - Kamera -->
      <div class="camera-panel">
        <div class="panel-header">
          <h3>📹 Kamera Görüntüsü</h3>
          <div class="camera-controls">
            <button 
              @click="toggleDetection" 
              :class="['btn', isDetectionActive ? 'btn-danger' : 'btn-success']"
            >
              {{ isDetectionActive ? '⏹️ Durdur' : '▶️ Başlat' }}
            </button>
          </div>
        </div>
        
        <div class="camera-view">
          <div v-if="!isDetectionActive" class="camera-placeholder">
            <div class="placeholder-content">
              <i class="camera-icon">📷</i>
              <p>Kamera Bekleniyor</p>
              <small>Tespit başlatmak için yukarıdaki butona tıklayın</small>
            </div>
          </div>
          
          <div v-else class="camera-active">
            <!-- Mock Kamera Görüntüsü -->
            <div class="mock-camera">
              <div class="mock-video">
                <div class="mock-overlay">
                  <div class="mock-info">
                    <div>Zaman: {{ currentTime }}</div>
                    <div>FPS: {{ currentFPS }}</div>
                    <div>Tespit: {{ currentDetections.length }} kişi</div>
                  </div>
                  
                  <!-- Mock Detections -->
                  <div 
                    v-for="detection in currentDetections.slice(-3)" 
                    :key="detection.id"
                    class="detection-box"
                    :style="getDetectionStyle(detection)"
                  >
                    <div class="detection-label">
                      <span class="worker-id">{{ detection.worker_id }}</span>
                      <span 
                        class="safety-status"
                        :class="detection.has_helmet ? 'safe' : 'danger'"
                      >
                        {{ detection.has_helmet ? '✅ Güvenli' : '⚠️ Baret Yok' }}
                      </span>
                      <span class="confidence">{{ Math.round(detection.confidence * 100) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sağ Panel - Bilgiler -->
      <div class="info-panel">
        <!-- Son Tespitler -->
        <div class="info-card">
          <h4>🎯 Son Tespitler</h4>
          <div class="detection-list">
            <div 
              v-for="detection in recentDetections.slice(0, 5)" 
              :key="detection.id"
              class="detection-item"
            >
              <div class="detection-time">
                {{ formatTime(detection.timestamp) }}
              </div>
              <div class="detection-details">
                <strong>ID:</strong> {{ detection.track_id }}
                <br>
                <span :class="['ppe-status', detection.has_helmet ? 'safe' : 'danger']">
                  {{ detection.has_helmet ? '✅ Baret Var' : '❌ Baret Yok' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Hızlı İstatistikler -->
        <div class="info-card">
          <h4>📊 Günlük İstatistikler</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ dailyStats.totalDetections }}</div>
              <div class="stat-label">Toplam Tespit</div>
            </div>
            <div class="stat-item">
              <div class="stat-value safe">{{ dailyStats.safeDetections }}</div>
              <div class="stat-label">Güvenli</div>
            </div>
            <div class="stat-item">
              <div class="stat-value danger">{{ dailyStats.violations }}</div>
              <div class="stat-label">İhlal</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ dailyStats.complianceRate }}%</div>
              <div class="stat-label">Uyum Oranı</div>
            </div>
          </div>
        </div>

        <!-- Hızlı Eylemler -->
        <div class="info-card">
          <h4>⚡ Hızlı Eylemler</h4>
          <div class="action-buttons">
            <button @click="$router.push('/violations')" class="action-btn">
              ⚠️ İhlalleri Görüntüle
            </button>
            <button @click="$router.push('/workers')" class="action-btn">
              👥 Çalışan Listesi
            </button>
            <button @click="$router.push('/settings')" class="action-btn">
              ⚙️ Ayarlar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MainView',
  data() {
    return {
      API_BASE_URL: 'http://localhost:5001/api',
      
      isDetectionActive: false,
      connectionStatus: 'connected',
      currentDetections: [],
      recentDetections: [],
      activeWorkerCount: 0,
      todayViolations: 0,
      currentTime: '',
      currentFPS: 30,
      dailyStats: {
        totalDetections: 0,
        safeDetections: 0,
        violations: 0,
        complianceRate: 100
      },
      pollInterval: null,
      timeInterval: null
    }
  },
  
  computed: {
    connectionStatusText() {
      switch(this.connectionStatus) {
        case 'connected': return 'Bağlı'
        case 'connecting': return 'Bağlanıyor...'
        case 'error': return 'Bağlantı Hatası'
        case 'disconnected': return 'Bağlantı Kesildi'
        default: return 'Bilinmiyor'
      }
    }
  },
  
  mounted() {
    console.log('🚀 MainView yüklendi');
    console.log('📡 API_BASE_URL:', this.API_BASE_URL);
    this.loadDailyStats();
    this.startPolling();
    this.startTimeUpdate();
  },
  
  beforeUnmount() {
    console.log('🛑 MainView kapatılıyor');
    this.stopPolling();
    this.stopTimeUpdate();
  },
  
  methods: {
    async toggleDetection() {
      console.log('🎬 Toggle detection:', this.isDetectionActive ? 'STOP' : 'START');
      
      this.isDetectionActive = !this.isDetectionActive;
      
      if (this.isDetectionActive) {
        await this.startDetection();
      } else {
        await this.stopDetection();
      }
    },
    
    async startDetection() {
      try {
        console.log('🎬 Tespit başlatılıyor...');
        
        const response = await fetch(`${this.API_BASE_URL}/ppe/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Tespit başlatıldı:', result.message);
          this.connectionStatus = 'connected';
        } else {
          console.error('❌ Tespit başlatma hatası:', result.message);
          this.isDetectionActive = false;
        }
      } catch (error) {
        console.error('❌ Tespit başlatma hatası:', error);
        this.isDetectionActive = false;
        this.connectionStatus = 'error';
      }
    },
    
    async stopDetection() {
      try {
        console.log('⏹️ Tespit durduruluyor...');
        
        const response = await fetch(`${this.API_BASE_URL}/ppe/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Tespit durduruldu:', result.message);
          this.currentDetections = [];
        }
      } catch (error) {
        console.error('❌ Tespit durdurma hatası:', error);
      }
    },
    
    startPolling() {
      console.log('🔄 Polling başlatılıyor...');
      this.pollInterval = setInterval(async () => {
        if (this.isDetectionActive) {
          await this.fetchLatestDetections();
        }
        await this.fetchStats();
      }, 2000);
    },
    
    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
        console.log('🛑 Polling durduruldu');
      }
    },
    
    startTimeUpdate() {
      this.updateTime();
      this.timeInterval = setInterval(this.updateTime, 1000);
    },
    
    stopTimeUpdate() {
      if (this.timeInterval) {
        clearInterval(this.timeInterval);
        this.timeInterval = null;
      }
    },
    
    updateTime() {
      this.currentTime = new Date().toLocaleTimeString('tr-TR');
    },
    
    async fetchLatestDetections() {
      try {
        const response = await fetch(`${this.API_BASE_URL}/ppe/detections`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.detections) {
          const detections = result.data.detections;
          
          if (detections.length > 0) {
            this.currentDetections = detections;
            
            // Son tespitleri güncelle
            detections.forEach(detection => {
              const exists = this.recentDetections.find(r => r.id === detection.id);
              if (!exists) {
                this.recentDetections.unshift(detection);
              }
            });
            
            // Maksimum 50 tespit tut
            if (this.recentDetections.length > 50) {
              this.recentDetections = this.recentDetections.slice(0, 50);
            }
          }
          
          this.connectionStatus = 'connected';
        }
      } catch (error) {
        console.error('❌ Tespit verisi alınamadı:', error);
        this.connectionStatus = 'error';
      }
    },
    
    async fetchStats() {
      try {
        const response = await fetch(`${this.API_BASE_URL}/ppe/stats`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.stats) {
          const stats = result.data.stats;
          
          this.dailyStats = {
            totalDetections: stats.totalDetections || 0,
            safeDetections: stats.safeDetections || 0,
            violations: stats.violations || 0,
            complianceRate: stats.complianceRate || 100
          };
          
          this.activeWorkerCount = stats.activeWorkers || 0;
          this.todayViolations = stats.violations || 0;
        }
      } catch (error) {
        console.error('❌ İstatistik verisi alınamadı:', error);
      }
    },
    
    async loadDailyStats() {
      try {
        console.log('📊 İstatistikler yükleniyor...');
        
        const response = await fetch(`${this.API_BASE_URL}/ppe/stats`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const stats = result.data.stats || result.data;
          
          this.dailyStats = {
            totalDetections: stats.totalDetections || 0,
            safeDetections: stats.safeDetections || 0,
            violations: stats.violations || 0,
            complianceRate: stats.complianceRate || 100
          };
          
          this.activeWorkerCount = stats.activeWorkers || 0;
          this.todayViolations = stats.violations || 0;
          
          console.log('✅ İstatistikler yüklendi:', this.dailyStats);
        }
      } catch (error) {
        console.error('❌ İstatistik yükleme hatası:', error);
      }
    },

    getDetectionStyle(detection) {
      // Mock pozisyonlar - gerçek uygulamada detection.bbox kullanılır
      const positions = [
        { left: '15%', top: '25%' },
        { left: '45%', top: '35%' },
        { left: '70%', top: '20%' }
      ];
      
      const index = detection.track_id % positions.length;
      
      return {
        ...positions[index],
        width: '120px',
        height: '80px'
      };
    },
    
    formatTime(timestamp) {
      if (!timestamp) return '--:--:--';
      return new Date(timestamp).toLocaleTimeString('tr-TR');
    }
  }
}
</script>

<style scoped>
.main-container {
  padding: 1rem;
  background: #f8f9fa;
  min-height: 100vh;
}

.status-bar {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-weight: 500;
  color: #6c757d;
}

.status-value {
  font-weight: bold;
}

.status-value.connected { color: #28a745; }
.status-value.disconnected { color: #ffc107; }
.status-value.error { color: #dc3545; }

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  height: calc(100vh - 200px);
}

.camera-panel,
.info-panel {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.camera-view {
  height: calc(100% - 60px);
  background: #000;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.camera-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #333, #555);
  border-radius: 8px;
}

.placeholder-content {
  text-align: center;
  color: white;
}

.camera-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

/* ✅ CAMERA-ACTIVE DÜZELTME */
.camera-active {
  height: 100%;
  width: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

/* ✅ MOCK KAMERA STİLLERİ - DÜZELTME */
.mock-camera {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  min-height: 400px; /* ✅ Minimum yükseklik ekle */
}

.mock-video {
  width: 100%;
  height: 100%;
  position: relative;
  background: 
    radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 2px, transparent 2px),
    radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1) 1px, transparent 1px),
    radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 1px, transparent 1px);
  animation: mockNoise 2s infinite;
}

@keyframes mockNoise {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}

.mock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 15px;
}

.mock-info {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  z-index: 10;
}

.detection-box {
  position: absolute;
  border: 3px solid #00ff00;
  background: rgba(0,255,0,0.15);
  border-radius: 4px;
  min-width: 120px;
  min-height: 80px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
}

.detection-label {
  position: absolute;
  top: -30px;
  left: 0;
  background: rgba(0,0,0,0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  display: flex;
  gap: 8px;
  z-index: 5;
}

.safety-status.safe {
  color: #28a745;
  font-weight: bold;
}

.safety-status.danger {
  color: #dc3545;
  font-weight: bold;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.confidence {
  color: #ffc107;
  font-weight: bold;
}

.worker-id {
  color: #17a2b8;
  font-weight: bold;
}

/* DİĞER STİLLER AYNI KALACAK */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.info-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.info-card h4 {
  margin-bottom: 1rem;
  color: #495057;
}

.detection-list {
  max-height: 200px;
  overflow-y: auto;
}

.detection-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.detection-item:last-child {
  border-bottom: none;
}

.detection-time {
  font-size: 0.8rem;
  color: #6c757d;
  white-space: nowrap;
}

.ppe-status.safe { color: #28a745; }
.ppe-status.danger { color: #dc3545; }

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #495057;
}

.stat-value.safe { color: #28a745; }
.stat-value.danger { color: #dc3545; }

.stat-label {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.action-btn:hover {
  background: #0056b3;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-success { background: #28a745; color: white; }
.btn-danger { background: #dc3545; color: white; }
</style>
