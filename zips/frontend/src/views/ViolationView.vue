<template>
  <div class="violations-container">
    <!-- Sayfa Başlığı -->
    <div class="page-header">
      <div class="header-content">
        <h1>⚠️ İhlal Kayıtları</h1>
        <p>PPE güvenlik ihlallerini görüntüleyin ve yönetin</p>
      </div>
      <div class="header-actions">
        <button @click="exportViolations" class="btn btn-secondary">
          📊 Excel'e Aktar
        </button>
        <button @click="refreshViolations" class="btn btn-primary" :disabled="isLoading">
          <span v-if="isLoading">🔄 Yenileniyor...</span>
          <span v-else>🔄 Yenile</span>
        </button>
      </div>
    </div>

    <!-- İstatistik Kartları -->
    <div class="stats-cards">
      <div class="stat-card danger">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">{{ violationStats.total }}</div>
          <div class="stat-label">Toplam İhlal</div>
        </div>
      </div>
      
      <div class="stat-card warning">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">{{ violationStats.today }}</div>
          <div class="stat-label">Bugünkü İhlaller</div>
        </div>
      </div>
      
      <div class="stat-card info">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ violationStats.uniqueWorkers }}</div>
          <div class="stat-label">İhlal Yapan Çalışan</div>
        </div>
      </div>
      
      <div class="stat-card success">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value">{{ violationStats.complianceRate }}%</div>
          <div class="stat-label">Uyum Oranı</div>
        </div>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="filters-section">
      <div class="filters-card">
        <h3>🔍 Filtreler</h3>
        <div class="filters-grid">
          <div class="filter-group">
            <label>📅 Tarih Aralığı:</label>
            <div class="date-range">
              <input 
                v-model="filters.startDate" 
                type="date" 
                class="form-control"
              />
              <span>-</span>
              <input 
                v-model="filters.endDate" 
                type="date" 
                class="form-control"
              />
            </div>
          </div>
          
          <div class="filter-group">
            <label>👤 Çalışan ID:</label>
            <input 
              v-model="filters.workerId" 
              type="text" 
              placeholder="Çalışan ID girin"
              class="form-control"
            />
          </div>
          
          <div class="filter-group">
            <label>🦺 İhlal Türü:</label>
            <select v-model="filters.violationType" class="form-control">
              <option value="">Tümü</option>
              <option value="no_helmet">Baret Yok</option>
              <option value="no_vest">Yelek Yok</option>
              <option value="no_gloves">Eldiven Yok</option>
              <option value="multiple">Çoklu İhlal</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>📊 Güven Seviyesi:</label>
            <select v-model="filters.confidenceLevel" class="form-control">
              <option value="">Tümü</option>
              <option value="high">Yüksek (>80%)</option>
              <option value="medium">Orta (50-80%)</option>
              <option value="low">Düşük (<50%)</option>
            </select>
          </div>
        </div>
        
        <div class="filter-actions">
          <button @click="applyFilters" class="btn btn-primary">
            🔍 Filtrele
          </button>
          <button @click="clearFilters" class="btn btn-secondary">
            🗑️ Temizle
          </button>
        </div>
      </div>
    </div>

    <!-- İhlal Tablosu -->
    <div class="violations-table-section">
      <div class="table-header">
        <h3>📋 İhlal Listesi</h3>
        <div class="table-info">
          Toplam {{ filteredViolations.length }} kayıt gösteriliyor
        </div>
      </div>
      
      <div class="table-container">
        <table class="violations-table">
          <thead>
            <tr>
              <th @click="sortBy('id')" class="sortable">
                ID
                <span class="sort-icon" v-if="sortField === 'id'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('timestamp')" class="sortable">
                Tarih/Saat
                <span class="sort-icon" v-if="sortField === 'timestamp'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('worker_id')" class="sortable">
                Çalışan ID
                <span class="sort-icon" v-if="sortField === 'worker_id'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>İhlal Türü</th>
              <th @click="sortBy('confidence')" class="sortable">
                Güven
                <span class="sort-icon" v-if="sortField === 'confidence'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Görsel</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="7" class="loading-row">
                <div class="loading-spinner">🔄 Yükleniyor...</div>
              </td>
            </tr>
            <tr v-else-if="filteredViolations.length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-state">
                  <div class="empty-icon">📭</div>
                  <p>Kayıt bulunamadı</p>
                  <small>Filtre kriterlerinizi değiştirmeyi deneyin</small>
                </div>
              </td>
            </tr>
            <tr 
              v-else
              v-for="violation in paginatedViolations" 
              :key="violation.id"
              class="violation-row"
            >
              <td class="id-cell">#{{ violation.id }}</td>
              <td class="date-cell">
                <div class="date-time">
                  <div class="date">{{ formatDate(violation.timestamp) }}</div>
                  <div class="time">{{ formatTime(violation.timestamp) }}</div>
                </div>
              </td>
              <td class="worker-cell">
                <div class="worker-info">
                  <strong>{{ violation.worker_id || 'Bilinmiyor' }}</strong>
                  <small v-if="violation.worker_name">{{ violation.worker_name }}</small>
                </div>
              </td>
              <td class="violation-type-cell">
                <div class="violation-badges">
                  <span 
                    v-for="type in getViolationTypes(violation)" 
                    :key="type.key"
                    :class="['violation-badge', type.class]"
                  >
                    {{ type.icon }} {{ type.label }}
                  </span>
                </div>
              </td>
              <td class="confidence-cell">
                <div class="confidence-bar">
                  <div 
                    class="confidence-fill" 
                    :style="{ width: (violation.confidence * 100) + '%' }"
                    :class="getConfidenceClass(violation.confidence)"
                  ></div>
                  <span class="confidence-text">
                    {{ (violation.confidence * 100).toFixed(1) }}%
                  </span>
                </div>
              </td>
              <td class="image-cell">
                <button 
                  v-if="violation.image_path"
                  @click="showImage(violation)" 
                  class="image-btn"
                  title="Görseli görüntüle"
                >
                  🖼️ Görsel
                </button>
                <span v-else class="no-image">❌ Yok</span>
              </td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button 
                    @click="viewDetails(violation)" 
                    class="action-btn view-btn"
                    title="Detayları görüntüle"
                  >
                    👁️
                  </button>
                  <button 
                    @click="deleteViolation(violation)" 
                    class="action-btn delete-btn"
                    title="Kaydı sil"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Sayfalama -->
      <div class="pagination-section">
        <div class="pagination-info">
          {{ (currentPage - 1) * itemsPerPage + 1 }} - 
          {{ Math.min(currentPage * itemsPerPage, filteredViolations.length) }} 
          / {{ filteredViolations.length }} kayıt
        </div>
        
        <div class="pagination-controls">
          <button 
            @click="currentPage = 1" 
            :disabled="currentPage === 1"
            class="pagination-btn"
          >
            ⏮️
          </button>
          <button 
            @click="currentPage--" 
            :disabled="currentPage === 1"
            class="pagination-btn"
          >
            ◀️
          </button>
          
          <span class="page-numbers">
            <button
              v-for="page in visiblePages"
              :key="page"
              @click="currentPage = page"
              :class="['page-btn', { active: page === currentPage }]"
            >
              {{ page }}
            </button>
          </span>
          
          <button 
            @click="currentPage++" 
            :disabled="currentPage === totalPages"
            class="pagination-btn"
          >
            ▶️
          </button>
          <button 
            @click="currentPage = totalPages" 
            :disabled="currentPage === totalPages"
            class="pagination-btn"
          >
            ⏭️
          </button>
        </div>
        
        <div class="items-per-page">
          <label>Sayfa başına:</label>
          <select v-model="itemsPerPage" @change="currentPage = 1">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Görsel Modal -->
    <div v-if="showImageModal" class="modal-overlay" @click="closeImageModal">
      <div class="image-modal" @click.stop>
        <div class="modal-header">
          <h3>🖼️ İhlal Görseli</h3>
          <button @click="closeImageModal" class="close-btn">✖️</button>
        </div>
        <div class="modal-body">
          <img 
            :src="selectedImage.url" 
            :alt="`İhlal #${selectedImage.id}`"
            class="violation-image"
          />
          <div class="image-info">
            <p><strong>İhlal ID:</strong> #{{ selectedImage.id }}</p>
            <p><strong>Tarih:</strong> {{ formatDateTime(selectedImage.timestamp) }}</p>
            <p><strong>Çalışan:</strong> {{ selectedImage.worker_id || 'Bilinmiyor' }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="downloadImage" class="btn btn-primary">
            💾 İndir
          </button>
          <button @click="closeImageModal" class="btn btn-secondary">
            ❌ Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- Detay Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="detail-modal" @click.stop>
        <div class="modal-header">
          <h3>📋 İhlal Detayları</h3>
          <button @click="closeDetailModal" class="close-btn">✖️</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <strong>İhlal ID:</strong>
              <span>#{{ selectedViolation.id }}</span>
            </div>
            <div class="detail-item">
              <strong>Tarih/Saat:</strong>
              <span>{{ formatDateTime(selectedViolation.timestamp) }}</span>
            </div>
            <div class="detail-item">
              <strong>Çalışan ID:</strong>
              <span>{{ selectedViolation.worker_id || 'Bilinmiyor' }}</span>
            </div>
            <div class="detail-item">
              <strong>Güven Seviyesi:</strong>
              <span>{{ (selectedViolation.confidence * 100).toFixed(1) }}%</span>
            </div>
            <div class="detail-item">
              <strong>İhlal Türleri:</strong>
              <div class="violation-types">
                <span 
                  v-for="type in getViolationTypes(selectedViolation)" 
                  :key="type.key"
                  :class="['violation-badge', type.class]"
                >
                  {{ type.icon }} {{ type.label }}
                </span>
              </div>
            </div>
            <div class="detail-item full-width" v-if="selectedViolation.notes">
              <strong>Notlar:</strong>
              <p>{{ selectedViolation.notes }}</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDetailModal" class="btn btn-secondary">
            ❌ Kapat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ViolationView',
  data() {
    return {
      violations: [],
      filteredViolations: [],
      isLoading: false,
      
      // İstatistikler
      violationStats: {
        total: 0,
        today: 0,
        uniqueWorkers: 0,
        complianceRate: 0
      },
      
      // Filtreler
      filters: {
        startDate: '',
        endDate: '',
        workerId: '',
        violationType: '',
        confidenceLevel: ''
      },
      
      // Sıralama
      sortField: 'timestamp',
      sortDirection: 'desc',
      
      // Sayfalama
      currentPage: 1,
      itemsPerPage: 25,
      
      // Modaller
      showImageModal: false,
      showDetailModal: false,
      selectedImage: null,
      selectedViolation: null
    }
  },
  
  computed: {
    paginatedViolations() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredViolations.slice(start, end)
    },
    
    totalPages() {
      return Math.ceil(this.filteredViolations.length / this.itemsPerPage)
    },
    
    visiblePages() {
      const pages = []
      const total = this.totalPages
      const current = this.currentPage
      
      // Basit sayfalama mantığı
      let start = Math.max(1, current - 2)
      let end = Math.min(total, current + 2)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      return pages
    }
  },
  
  mounted() {
    this.initializePage()
  },
  
  methods: {
    async initializePage() {
      // Varsayılan tarih aralığını ayarla (son 30 gün)
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      this.filters.endDate = today.toISOString().split('T')[0]
      this.filters.startDate = thirtyDaysAgo.toISOString().split('T')[0]
      
      await this.loadViolations()
      await this.loadStats()
    },
    
    async loadViolations() {
      this.isLoading = true
      try {
        const response = await fetch('http://localhost:8000/violations', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          this.violations = await response.json()
          this.applyFilters()
        }
      } catch (error) {
        console.error('İhlaller yüklenemedi:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async loadStats() {
      try {
        const response = await fetch('http://localhost:8000/violations/stats')
        if (response.ok) {
          this.violationStats = await response.json()
        }
      } catch (error) {
        console.error('İstatistikler yüklenemedi:', error)
      }
    },
    
    applyFilters() {
      let filtered = [...this.violations]
      
      // Tarih filtresi
      if (this.filters.startDate) {
        const startDate = new Date(this.filters.startDate).getTime() / 1000
        filtered = filtered.filter(v => v.timestamp >= startDate)
      }
      
      if (this.filters.endDate) {
        const endDate = new Date(this.filters.endDate).getTime() / 1000 + 86400 // Gün sonu
        filtered = filtered.filter(v => v.timestamp <= endDate)
      }
      
      // Çalışan ID filtresi
      if (this.filters.workerId) {
        const workerId = this.filters.workerId.toLowerCase()
        filtered = filtered.filter(v => 
          v.worker_id && v.worker_id.toLowerCase().includes(workerId)
        )
      }
      
      // İhlal türü filtresi
      if (this.filters.violationType) {
        filtered = filtered.filter(v => {
          switch (this.filters.violationType) {
            case 'no_helmet':
              return !v.has_helmet
            case 'no_vest':
              return !v.has_vest
            case 'no_gloves':
              return !v.has_gloves
            case 'multiple':
              return (!v.has_helmet + !v.has_vest + !v.has_gloves) > 1
            default:
              return true
          }
        })
      }
      
      // Güven seviyesi filtresi
      if (this.filters.confidenceLevel) {
        filtered = filtered.filter(v => {
          const confidence = v.confidence * 100
          switch (this.filters.confidenceLevel) {
            case 'high':
              return confidence > 80
            case 'medium':
              return confidence >= 50 && confidence <= 80
            case 'low':
              return confidence < 50
            default:
              return true
          }
        })
      }
      
      this.filteredViolations = filtered
      this.sortViolations()
      this.currentPage = 1
    },
    
    clearFilters() {
      this.filters = {
        startDate: '',
        endDate: '',
        workerId: '',
        violationType: '',
        confidenceLevel: ''
      }
      this.applyFilters()
    },
    
    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortField = field
        this.sortDirection = 'desc'
      }
      this.sortViolations()
    },
    
    sortViolations() {
      this.filteredViolations.sort((a, b) => {
        let aVal = a[this.sortField]
        let bVal = b[this.sortField]
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }
        
        if (this.sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })
    },
    
    async refreshViolations() {
      await this.loadViolations()
      await this.loadStats()
    },
    
    getViolationTypes(violation) {
      const types = []
      
      if (!violation.has_helmet) {
        types.push({
          key: 'helmet',
          icon: '🪖',
          label: 'Baret Yok',
          class: 'danger'
        })
      }
      
      if (!violation.has_vest) {
        types.push({
          key: 'vest',
          icon: '🦺',
          label: 'Yelek Yok',
          class: 'warning'
        })
      }
      
      if (!violation.has_gloves) {
        types.push({
          key: 'gloves',
          icon: '🧤',
          label: 'Eldiven Yok',
          class: 'info'
        })
      }
      
      return types
    },
    
    getConfidenceClass(confidence) {
      const percent = confidence * 100
      if (percent >= 80) return 'high'
      if (percent >= 50) return 'medium'
      return 'low'
    },
    
    showImage(violation) {
      this.selectedImage = {
        id: violation.id,
        url: `http://localhost:8000/images/${violation.image_path}`,
        timestamp: violation.timestamp,
        worker_id: violation.worker_id
      }
      this.showImageModal = true
    },
    
    closeImageModal() {
      this.showImageModal = false
      this.selectedImage = null
    },
    
    downloadImage() {
      if (this.selectedImage) {
        const link = document.createElement('a')
        link.href = this.selectedImage.url
        link.download = `ihlal_${this.selectedImage.id}.jpg`
        link.click()
      }
    },
    
    viewDetails(violation) {
      this.selectedViolation = violation
      this.showDetailModal = true
    },
    
    closeDetailModal() {
      this.showDetailModal = false
      this.selectedViolation = null
    },
    
    async deleteViolation(violation) {
      if (confirm(`#${violation.id} numaralı ihlal kaydını silmek istediğinizden emin misiniz?`)) {
        try {
          const response = await fetch(`http://localhost:8000/violations/${violation.id}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            await this.refreshViolations()
            alert('İhlal kaydı başarıyla silindi! ✅')
          } else {
            alert('İhlal kaydı silinirken hata oluştu! ❌')
          }
        } catch (error) {
          console.error('Silme hatası:', error)
          alert('Bağlantı hatası! 🔄')
        }
      }
    },
    
    async exportViolations() {
      try {
        const response = await fetch('http://localhost:8000/violations/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.filters)
        })
        
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `ihlaller_${new Date().toISOString().split('T')[0]}.xlsx`
          link.click()
          window.URL.revokeObjectURL(url)
        }
      } catch (error) {
        console.error('Dışa aktarma hatası:', error)
        alert('Dışa aktarma sırasında hata oluştu! ❌')
      }
    },
    
    formatDate(timestamp) {
      return new Date(timestamp * 1000).toLocaleDateString('tr-TR')
    },
    
    formatTime(timestamp) {
      return new Date(timestamp * 1000).toLocaleTimeString('tr-TR')
    },
    
    formatDateTime(timestamp) {
      return new Date(timestamp * 1000).toLocaleString('tr-TR')
    }
  }
}
</script>

<style scoped>
.violations-container {
  padding: 2rem;
  background: #f8f9fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.header-content p {
  color: #6c757d;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card.danger { border-left: 4px solid #dc3545; }
.stat-card.warning { border-left: 4px solid #ffc107; }
.stat-card.info { border-left: 4px solid #17a2b8; }
.stat-card.success { border-left: 4px solid #28a745; }

.stat-icon {
  font-size: 2rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.stat-label {
  color: #6c757d;
  font-size: 0.9rem;
}

.filters-section {
  margin-bottom: 2rem;
}

.filters-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filters-card h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #495057;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
}

.filter-actions {
  display: flex;
  gap: 1rem;
}

.violations-table-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.table-header h3 {
  margin: 0;
  color: #2c3e50;
}

.table-info {
  color: #6c757d;
  font-size: 0.9rem;
}

.table-container {
  overflow-x: auto;
}

.violations-table {
  width: 100%;
  border-collapse: collapse;
}

.violations-table th,
.violations-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.violations-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
  z-index: 10;
}

.violations-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.3s;
}

.violations-table th.sortable:hover {
  background: #e9ecef;
}

.sort-icon {
  margin-left: 0.5rem;
  color: #007bff;
}

.violation-row:hover {
  background: #f8f9fa;
}

.id-cell {
  font-weight: bold;
  color: #007bff;
}

.date-cell .date-time {
  display: flex;
  flex-direction: column;
}

.date-cell .date {
  font-weight: 600;
  color: #495057;
}

.date-cell .time {
  font-size: 0.8rem;
  color: #6c757d;
}

.worker-cell .worker-info {
  display: flex;
  flex-direction: column;
}

.worker-cell small {
  color: #6c757d;
}

.violation-badges {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.violation-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.violation-badge.danger {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.violation-badge.warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.violation-badge.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.confidence-cell {
  min-width: 120px;
}

.confidence-bar {
  position: relative;
  background: #e9ecef;
  border-radius: 10px;
  height: 20px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  transition: width 0.3s;
  border-radius: 10px;
}

.confidence-fill.high {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.confidence-fill.medium {
  background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.confidence-fill.low {
  background: linear-gradient(90deg, #dc3545, #e83e8c);
}

.confidence-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.image-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s;
}

.image-btn:hover {
  background: #138496;
}

.no-image {
  color: #6c757d;
  font-size: 0.8rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: 1px solid #dee2e6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #f8f9fa;
}

.view-btn:hover {
  border-color: #007bff;
  color: #007bff;
}

.delete-btn:hover {
  border-color: #dc3545;
  color: #dc3545;
}

.loading-row,
.empty-row {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  font-size: 1.2rem;
  color: #6c757d;
}

.empty-state {
  color: #6c757d;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.pagination-info {
  color: #6c757d;
  font-size: 0.9rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn,
.page-btn {
  background: white;
  border: 1px solid #dee2e6;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination-btn:hover:not(:disabled),
.page-btn:hover {
  background: #e9ecef;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.items-per-page label {
  color: #6c757d;
  font-size: 0.9rem;
}

.items-per-page select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

/* Modal Stilleri */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.image-modal,
.detail-modal {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

.image-modal {
  width: 800px;
}

.detail-modal {
  width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.3s;
}

.close-btn:hover {
  background: #e9ecef;
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.violation-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.image-info p {
  margin: 0.5rem 0;
  color: #495057;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item strong {
  color: #495057;
  font-size: 0.9rem;
}

.detail-item span,
.detail-item p {
  color: #6c757d;
}

.violation-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Animasyonlar */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Tasarım */
@media (max-width: 768px) {
  .violations-container {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .table-container {
    font-size: 0.8rem;
  }
  
  .violations-table th,
  .violations-table td {
    padding: 0.5rem;
  }
  
  .pagination-section {
    flex-direction: column;
    gap: 1rem;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .image-modal,
  .detail-modal {
    width: 95vw;
    margin: 1rem;
  }
}

@media (max-width: 480px) {
  .violation-badges {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .confidence-bar {
    min-width: 80px;
  }
  
  .date-range {
    flex-direction: column;
  }
}
</style>
