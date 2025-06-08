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
            <!-- Gerçek zamanlı görüntü simülasyonu -->
            <div class="video-feed">
              <div class="detection-overlay">
                <!-- Tespit kutuları -->
                <div 
                  v-for="detection in currentDetections" 
                  :key="detection.id"
                  class="detection-box"
                  :style="getDetectionStyle(detection)"
                >
                  <div class="detection-label">
                    ID: {{ detection.track_id }}
                    <br>
                    Güven: {{ (detection.confidence * 100).toFixed(1) }}%
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Kamera bilgileri -->
            <div class="camera-info">
              <div class="info-item">
                <strong>Zaman:</strong> {{ currentTime }}
              </div>
              <div class="info-item">
                <strong>FPS:</strong> {{ currentFPS }}
              </div>
              <div class="info-item">
                <strong>Tespit:</strong> {{ currentDetections.length }} kişi
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
        complianceRate: 0
      },
      pollInterval: null,
      timeInterval: null
    }
  },
  computed: {
    connectionStatusText() {
      const statusMap = {
        'connected': 'Bağlı',
        'disconnected': 'Bağlantı Kesildi',
        'error': 'Hata'
      }
      return statusMap[this.connectionStatus] || 'Bilinmiyor'
    }
  },
  mounted() {
    this.startTimeUpdate()
    this.loadDailyStats()
    this.startPolling()
  },
  beforeUnmount() {
    this.stopPolling()
    this.stopTimeUpdate()
  },
  methods: {
    toggleDetection() {
      this.isDetectionActive = !this.isDetectionActive
      if (this.isDetectionActive) {
        this.startDetection()
      } else {
        this.stopDetection()
      }
    },
    
    async startDetection() {
      try {
        const response = await fetch('http://localhost:8000/detection/start', {
          method: 'POST'
        })
        if (response.ok) {
          console.log('Tespit başlatıldı')
        }
      } catch (error) {
        console.error('Tespit başlatma hatası:', error)
      }
    },
    
    async stopDetection() {
      try {
        const response = await fetch('http://localhost:8000/detection/stop', {
          method: 'POST'
        })
        if (response.ok) {
          console.log('Tespit durduruldu')
          this.currentDetections = []
        }
      } catch (error) {
        console.error('Tespit durdurma hatası:', error)
      }
    },
    
    startPolling() {
      this.pollInterval = setInterval(async () => {
        if (this.isDetectionActive) {
          await this.fetchLatestDetections()
        }
        await this.fetchStats()
      }, 1000)
    },
    
    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval)
      }
    },
    
    startTimeUpdate() {
      this.updateTime()
      this.timeInterval = setInterval(this.updateTime, 1000)
    },
    
    stopTimeUpdate() {
      if (this.timeInterval) {
        clearInterval(this.timeInterval)
      }
    },
    
    updateTime() {
      this.currentTime = new Date().toLocaleTimeString('tr-TR')
    },
    
    async fetchLatestDetections() {
      try {
        const response = await fetch('http://localhost:8000/ppe/latest')
        if (response.ok) {
          const data = await response.json()
          if (data.detection) {
            this.currentDetections = [data.detection]
            this.recentDetections.unshift(data)
            if (this.recentDetections.length > 50) {
              this.recentDetections.pop()
            }
          }
          this.connectionStatus = 'connected'
        }
      } catch (error) {
        console.error('Tespit verisi alınamadı:', error)
        this.connectionStatus = 'error'
      }
    },
    
    async fetchStats() {
      try {
        const response = await fetch('http://localhost:8000/stats/daily')
        if (response.ok) {
          const stats = await response.json()
          this.dailyStats = stats
          this.activeWorkerCount = stats.activeWorkers || 0
          this.todayViolations = stats.violations || 0
        }
      } catch (error) {
        console.error('İstatistik verisi alınamadı:', error)
      }
    },
    
    async loadDailyStats() {
      await this.fetchStats()
    },
    
    getDetectionStyle(detection) {
      // Tespit kutusunun pozisyonu (örnek)
      return {
        left: '20%',
        top: '30%',
        width: '200px',
        height: '150px'
      }
    },
    
    formatTime(timestamp) {
      if (!timestamp) return '--:--:--'
      return new Date(timestamp * 1000).toLocaleTimeString('tr-TR')
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

.camera-active {
  height: 100%;
  background: linear-gradient(45deg, #1a1a1a, #2d2d2d);
  position: relative;
}

.video-feed {
  height: 100%;
  position: relative;
}

.detection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.detection-box {
  position: absolute;
  border: 3px solid #00ff00;
  border-radius: 4px;
  background: rgba(0, 255, 0, 0.1);
}

.detection-label {
  position: absolute;
  top: -35px;
  left: 0;
  background: #00ff00;
  color: black;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
}

.camera-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
}

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
