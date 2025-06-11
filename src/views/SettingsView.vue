<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1>⚙️ Sistem Ayarları</h1>
      <p>Uygulama ayarlarını buradan yapılandırabilirsiniz</p>
    </div>

    <div class="settings-grid">
      <!-- Kamera Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <h3>📹 Kamera Ayarları</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Kamera URL:</label>
            <input 
              v-model="settings.camera.url" 
              type="text" 
              placeholder="rtsp://192.168.1.100:554/stream"
            />
          </div>
          
          <div class="form-group">
            <label>FPS Limiti:</label>
            <input 
              v-model.number="settings.camera.fps" 
              type="number" 
              min="1" 
              max="60"
            />
          </div>
          
          <div class="form-group">
            <label>Çözünürlük:</label>
            <select v-model="settings.camera.resolution">
              <option value="640x480">640x480</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="1920x1080">1920x1080 (Full HD)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- AI Model Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <h3>🤖 AI Model Ayarları</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Model Dosyası:</label>
            <input 
              v-model="settings.ai.modelPath" 
              type="text" 
              placeholder="model/best.pt"
            />
          </div>
          
          <div class="form-group">
            <label>Güven Eşiği:</label>
            <div class="slider-container">
              <input 
                v-model.number="settings.ai.confidence" 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1"
                class="slider"
              />
              <span class="slider-value">{{ (settings.ai.confidence * 100).toFixed(0) }}%</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>NMS Eşiği:</label>
            <div class="slider-container">
              <input 
                v-model.number="settings.ai.nmsThreshold" 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1"
                class="slider"
              />
              <span class="slider-value">{{ (settings.ai.nmsThreshold * 100).toFixed(0) }}%</span>
            </div>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                v-model="settings.ai.useGPU" 
                type="checkbox"
              />
              <span class="checkmark"></span>
              GPU Kullan (CUDA)
            </label>
          </div>
        </div>
      </div>

      <!-- E-posta Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <h3>📧 E-posta Bildirimleri</h3>
        </div>
        <div class="card-body">
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                v-model="settings.email.enabled" 
                type="checkbox"
              />
              <span class="checkmark"></span>
              E-posta bildirimlerini etkinleştir
            </label>
          </div>
          
          <template v-if="settings.email.enabled">
            <div class="form-group">
              <label>SMTP Sunucusu:</label>
              <input 
                v-model="settings.email.smtpServer" 
                type="text" 
                placeholder="smtp.gmail.com"
              />
            </div>
            
            <div class="form-group">
              <label>SMTP Port:</label>
              <input 
                v-model.number="settings.email.smtpPort" 
                type="number" 
                placeholder="587"
              />
            </div>
            
            <div class="form-group">
              <label>Gönderen E-posta:</label>
              <input 
                v-model="settings.email.senderEmail" 
                type="email" 
                placeholder="sistem@sirket.com"
              />
            </div>
            
            <div class="form-group">
              <label>E-posta Şifresi:</label>
              <input 
                v-model="settings.email.senderPassword" 
                type="password" 
                placeholder="••••••••"
              />
            </div>
            
            <div class="form-group">
              <label>Alıcı E-postalar:</label>
              <textarea 
                v-model="settings.email.recipients" 
                placeholder="admin@sirket.com, guvenlik@sirket.com"
                rows="3"
              ></textarea>
              <small>Virgülle ayırarak birden fazla e-posta adresi girebilirsiniz</small>
            </div>
          </template>
        </div>
      </div>

      <!-- Veritabanı Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <h3>🗄️ Veritabanı Ayarları</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Veritabanı Tipi:</label>
            <select v-model="settings.database.type">
              <option value="sqlite">SQLite (Yerel)</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>
          
          <template v-if="settings.database.type !== 'sqlite'">
            <div class="form-group">
              <label>Sunucu Adresi:</label>
              <input 
                v-model="settings.database.host" 
                type="text" 
                placeholder="localhost"
              />
            </div>
            
            <div class="form-group">
              <label>Port:</label>
              <input 
                v-model.number="settings.database.port" 
                type="number" 
                :placeholder="settings.database.type === 'mysql' ? '3306' : '5432'"
              />
            </div>
            
            <div class="form-group">
              <label>Veritabanı Adı:</label>
              <input 
                v-model="settings.database.name" 
                type="text" 
                placeholder="ppe_tracking"
              />
            </div>
            
            <div class="form-group">
              <label>Kullanıcı Adı:</label>
              <input 
                v-model="settings.database.username" 
                type="text" 
                placeholder="admin"
              />
            </div>
            
            <div class="form-group">
              <label>Şifre:</label>
              <input 
                v-model="settings.database.password" 
                type="password" 
                placeholder="••••••••"
              />
            </div>
          </template>
          
          <div class="form-group">
            <button @click="testDatabaseConnection" class="test-btn">
              🔍 Bağlantıyı Test Et
            </button>
          </div>
        </div>
      </div>

      <!-- Genel Ayarlar -->
      <div class="settings-card">
        <div class="card-header">
          <h3>🔧 Genel Ayarlar</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Kayıt Saklama Süresi (gün):</label>
            <input 
              v-model.number="settings.general.retentionDays" 
              type="number" 
              min="1" 
              max="365"
            />
          </div>
          
          <div class="form-group">
            <label>Otomatik Yedekleme:</label>
            <select v-model="settings.general.autoBackup">
              <option value="disabled">Devre Dışı</option>
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                v-model="settings.general.enableLogging" 
                type="checkbox"
              />
              <span class="checkmark"></span>
              Detaylı log kaydı
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input 
                v-model="settings.general.enableNotifications" 
                type="checkbox"
              />
              <span class="checkmark"></span>
              Sistem bildirimleri
            </label>
          </div>
        </div>
      </div>

      <!-- Performans Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <h3>⚡ Performans Ayarları</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>İşlemci Çekirdek Sayısı:</label>
            <input 
              v-model.number="settings.performance.cpuCores" 
              type="number" 
              min="1" 
              max="16"
            />
          </div>
          
          <div class="form-group">
            <label>Bellek Limiti (MB):</label>
            <input 
              v-model.number="settings.performance.memoryLimit" 
              type="number" 
              min="512" 
              max="8192"
            />
          </div>
          
          <div class="form-group">
            <label>Önbellek Boyutu:</label>
            <select v-model="settings.performance.cacheSize">
              <option value="small">Küçük (128MB)</option>
              <option value="medium">Orta (256MB)</option>
              <option value="large">Büyük (512MB)</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Kaydet Butonu -->
    <div class="settings-footer">
      <div class="button-group">
        <button @click="resetSettings" class="btn btn-secondary">
          🔄 Varsayılana Sıfırla
        </button>
        <button @click="saveSettings" class="btn btn-primary" :disabled="isSaving">
          <span v-if="isSaving">💾 Kaydediliyor...</span>
          <span v-else>💾 Ayarları Kaydet</span>
        </button>
      </div>
    </div>

    <!-- Başarı/Hata Mesajları -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsView',
  data() {
    return {
      isSaving: false,
      message: '',
      messageType: 'success',
      settings: {
        camera: {
          url: 'rtsp://192.168.1.100:554/stream',
          fps: 30,
          resolution: '1280x720'
        },
        ai: {
          modelPath: 'model/best.pt',
          confidence: 0.5,
          nmsThreshold: 0.4,
          useGPU: true
        },
        email: {
          enabled: false,
          smtpServer: 'smtp.gmail.com',
          smtpPort: 587,
          senderEmail: '',
          senderPassword: '',
          recipients: ''
        },
        database: {
          type: 'sqlite',
          host: 'localhost',
          port: 3306,
          name: 'ppe_tracking',
          username: '',
          password: ''
        },
        general: {
          retentionDays: 30,
          autoBackup: 'weekly',
          enableLogging: true,
          enableNotifications: true
        },
        performance: {
          cpuCores: 4,
          memoryLimit: 2048,
          cacheSize: 'medium'
        }
      }
    }
  },
  mounted() {
    this.loadSettings()
  },
  methods: {
    async loadSettings() {
      try {
        const response = await fetch('http://localhost:5001/settings')
        if (response.ok) {
          const data = await response.json()
          this.settings = { ...this.settings, ...data }
        }
      } catch (error) {
        console.error('Ayarlar yüklenemedi:', error)
      }
    },
    
    async saveSettings() {
      this.isSaving = true
      this.message = ''
      
      try {
        const response = await fetch('http://localhost:5001/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.settings)
        })
        
        if (response.ok) {
          this.showMessage('Ayarlar başarıyla kaydedildi! 🎉', 'success')
        } else {
          this.showMessage('Ayarlar kaydedilirken hata oluştu! ❌', 'error')
        }
      } catch (error) {
        console.error('Ayar kaydetme hatası:', error)
        this.showMessage('Bağlantı hatası! Lütfen tekrar deneyin. 🔄', 'error')
      } finally {
        this.isSaving = false
      }
    },
    
    async testDatabaseConnection() {
      try {
        const response = await fetch('http://localhost:5001/database/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.settings.database)
        })
        
        if (response.ok) {
          this.showMessage('Veritabanı bağlantısı başarılı! ✅', 'success')
        } else {
          this.showMessage('Veritabanı bağlantısı başarısız! ❌', 'error')
        }
      } catch (error) {
        console.error('Veritabanı test hatası:', error)
        this.showMessage('Bağlantı testi başarısız! 🔄', 'error')
      }
    },
    
    resetSettings() {
      if (confirm('Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?')) {
        // Varsayılan ayarları yükle
        this.settings = {
          camera: {
            url: 'rtsp://192.168.1.100:554/stream',
            fps: 30,
            resolution: '1280x720'
          },
          ai: {
            modelPath: 'model/best.pt',
            confidence: 0.5,
            nmsThreshold: 0.4,
            useGPU: true
          },
          email: {
            enabled: false,
            smtpServer: 'smtp.gmail.com',
            smtpPort: 587,
            senderEmail: '',
            senderPassword: '',
            recipients: ''
          },
          database: {
            type: 'sqlite',
            host: 'localhost',
            port: 3306,
            name: 'ppe_tracking',
            username: '',
            password: ''
          },
          general: {
            retentionDays: 30,
            autoBackup: 'weekly',
            enableLogging: true,
            enableNotifications: true
          },
          performance: {
            cpuCores: 4,
            memoryLimit: 2048,
            cacheSize: 'medium'
          }
        }
        this.showMessage('Ayarlar varsayılan değerlere sıfırlandı! 🔄', 'success')
      }
    },
    
    showMessage(text, type) {
      this.message = text
      this.messageType = type
      setTimeout(() => {
        this.message = ''
      }, 3000)
    }
  }
}
</script>

<style scoped>
.settings-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
}

.settings-header {
  text-align: center;
  margin-bottom: 2rem;
}

.settings-header h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.settings-header p {
  color: #6c757d;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.settings-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card-header {
  background: #3498db;
  color: white;
  padding: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.card-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: none;
}

.slider-value {
  font-weight: bold;
  color: #3498db;
  min-width: 50px;
  text-align: center;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.test-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s;
}

.test-btn:hover {
  background: #138496;
}

.settings-footer {
  text-align: center;
  margin-top: 2rem;
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #28a745;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #218838;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .button-group {
    flex-direction: column;
  }
  
  .settings-container {
    padding: 1rem;
  }
}
</style>
