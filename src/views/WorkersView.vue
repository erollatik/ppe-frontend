<template>
  <div class="workers-container">
    <!-- Sayfa Başlığı -->
    <div class="page-header">
      <div class="header-content">
        <h1>👥 Çalışan Yönetimi</h1>
        <p>Çalışan bilgileri, PPE atamaları ve güvenlik istatistikleri</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            @input="searchWorkers"
            type="text" 
            placeholder="🔍 Çalışan ara..." 
            class="search-input"
          >
        </div>
        <button @click="showAddWorkerModal" class="btn btn-primary">
          ➕ Yeni Çalışan
        </button>
        <button @click="exportWorkers" class="btn btn-outline" :disabled="isLoading">
          📊 Dışa Aktar
        </button>
        <button @click="importWorkers" class="btn btn-secondary">
          📥 İçe Aktar
        </button>
      </div>
    </div>

    <!-- İstatistik Kartları -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalWorkers }}</div>
          <div class="stat-label">Toplam Çalışan</div>
          <div class="stat-change positive">+{{ newWorkersThisMonth }} bu ay</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ activeWorkers }}</div>
          <div class="stat-label">Aktif Çalışan</div>
          <div class="stat-change positive">{{ Math.round((activeWorkers/totalWorkers)*100) }}% aktif</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value">{{ averageCompliance }}%</div>
          <div class="stat-label">Ortalama Uyum</div>
          <div class="stat-change" :class="complianceChange >= 0 ? 'positive' : 'negative'">
            {{ complianceChange >= 0 ? '+' : '' }}{{ complianceChange }}% bu hafta
          </div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalViolations }}</div>
          <div class="stat-label">Bu Ay İhlal</div>
          <div class="stat-change" :class="violationChange <= 0 ? 'positive' : 'negative'">
            {{ violationChange >= 0 ? '+' : '' }}{{ violationChange }} geçen aya göre
          </div>
        </div>
      </div>
    </div>

    <!-- Filtreler ve Sıralama -->
    <div class="filters-section">
      <div class="filters-left">
        <div class="filter-group">
          <label>🏢 Departman:</label>
          <select v-model="selectedDepartment" @change="applyFilters" class="filter-select">
            <option value="">Tüm Departmanlar</option>
            <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>📍 Lokasyon:</label>
          <select v-model="selectedLocation" @change="applyFilters" class="filter-select">
            <option value="">Tüm Lokasyonlar</option>
            <option v-for="location in locations" :key="location" :value="location">{{ location }}</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>📊 Durum:</label>
          <select v-model="selectedStatus" @change="applyFilters" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="training">Eğitimde</option>
            <option value="suspended">Askıda</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>🎯 Uyum Durumu:</label>
          <select v-model="selectedCompliance" @change="applyFilters" class="filter-select">
            <option value="">Tümü</option>
            <option value="excellent">Mükemmel (90%+)</option>
            <option value="good">İyi (75-89%)</option>
            <option value="average">Orta (60-74%)</option>
            <option value="poor">Zayıf (<60%)</option>
          </select>
        </div>
      </div>
      
      <div class="filters-right">
        <div class="view-controls">
          <button 
            @click="viewMode = 'cards'" 
            :class="['view-btn', { 'active': viewMode === 'cards' }]"
          >
            🃏 Kart
          </button>
          <button 
            @click="viewMode = 'table'" 
            :class="['view-btn', { 'active': viewMode === 'table' }]"
          >
            📋 Tablo
          </button>
        </div>
        
        <div class="sort-controls">
          <select v-model="sortBy" @change="applySorting" class="sort-select">
            <option value="name">İsme Göre</option>
            <option value="workerId">ID'ye Göre</option>
            <option value="department">Departmana Göre</option>
            <option value="compliance">Uyum Oranına Göre</option>
            <option value="violations">İhlal Sayısına Göre</option>
            <option value="lastSeen">Son Görülme</option>
          </select>
          <button @click="toggleSortOrder" class="sort-order-btn">
            {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
          </button>
        </div>
        
        <button @click="clearFilters" class="btn btn-outline">🔄 Temizle</button>
      </div>
    </div>

    <!-- Çalışan Listesi - Kart Görünümü -->
    <div v-if="viewMode === 'cards'" class="workers-grid">
      <div 
        v-for="worker in paginatedWorkers" 
        :key="worker.id"
        class="worker-card"
        :class="{ 
          'has-violations': worker.recentViolations > 0,
          'excellent-compliance': worker.complianceRate >= 90,
          'poor-compliance': worker.complianceRate < 60
        }"
        @click="showWorkerDetails(worker)"
      >
        <div class="worker-header">
          <div class="worker-avatar">
            <img 
              v-if="worker.photo" 
              :src="worker.photo" 
              :alt="worker.name"
              @error="handleImageError"
            >
            <div v-else class="avatar-placeholder">
              {{ getInitials(worker.name) }}
            </div>
          </div>
          
          <div class="worker-basic-info">
            <h3>{{ worker.name }}</h3>
            <p class="worker-id">ID: {{ worker.workerId }}</p>
            <div class="worker-status" :class="worker.status">
              <span class="status-dot"></span>
              {{ getStatusText(worker.status) }}
            </div>
          </div>
          
          <div class="worker-actions">
            <button @click.stop="editWorker(worker)" class="action-btn" title="Düzenle">
              ✏️
            </button>
            <button @click.stop="showWorkerHistory(worker)" class="action-btn" title="Geçmiş">
              📊
            </button>
            <div class="action-menu">
              <button @click.stop="toggleActionMenu(worker.id)" class="action-btn">⋮</button>
              <div v-if="activeActionMenu === worker.id" class="action-dropdown">
                <button @click.stop="assignPPE(worker)">🦺 PPE Ata</button>
                <button @click.stop="sendNotification(worker)">📱 Bildirim</button>
                <button @click.stop="generateReport(worker)">📄 Rapor</button>
                <button @click.stop="deactivateWorker(worker)" class="danger">🚫 Pasifleştir</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="worker-details">
          <div class="detail-row">
            <span class="detail-label">🏢 Departman:</span>
            <span class="detail-value">{{ worker.department }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📍 Lokasyon:</span>
            <span class="detail-value">{{ worker.location }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👔 Pozisyon:</span>
            <span class="detail-value">{{ worker.position }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📅 İşe Başlama:</span>
            <span class="detail-value">{{ formatDate(worker.startDate) }}</span>
          </div>
        </div>
        
        <div class="worker-ppe">
          <h4>🦺 Atanmış PPE</h4>
          <div class="ppe-list">
            <span 
              v-for="ppe in worker.assignedPPE" 
              :key="ppe.type"
              class="ppe-badge"
              :class="ppe.status"
              :title="`${ppe.type} - ${ppe.status === 'assigned' ? 'Atanmış' : 'Eksik'}`"
            >
              {{ getPPEIcon(ppe.type) }} {{ ppe.type }}
            </span>
          </div>
        </div>
        
        <div class="worker-metrics">
          <div class="metric-item">
            <div class="metric-header">
              <span class="metric-label">🎯 Uyum Oranı</span>
              <span class="metric-value" :class="getComplianceClass(worker.complianceRate)">
                {{ worker.complianceRate }}%
              </span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :class="getComplianceClass(worker.complianceRate)"
                :style="{ width: worker.complianceRate + '%' }"
              ></div>
            </div>
          </div>
          
          <div class="metric-grid">
            <div class="metric-small">
              <span class="metric-label">⚠️ Bu Ay İhlal</span>
              <span class="metric-value" :class="{ 'has-violations': worker.monthlyViolations > 0 }">
                {{ worker.monthlyViolations || 0 }}
              </span>
            </div>
            <div class="metric-small">
              <span class="metric-label">📅 Son Görülme</span>
              <span class="metric-value">{{ formatLastSeen(worker.lastSeen) }}</span>
            </div>
            <div class="metric-small">
              <span class="metric-label">🏆 Güvenlik Skoru</span>
              <span class="metric-value" :class="getScoreClass(worker.safetyScore)">
                {{ worker.safetyScore || 0 }}
              </span>
            </div>
            <div class="metric-small">
              <span class="metric-label">📚 Eğitim Durumu</span>
              <span class="metric-value" :class="worker.trainingStatus">
                {{ getTrainingStatusText(worker.trainingStatus) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="worker-footer">
          <div class="quick-actions">
            <button @click.stop="viewLiveLocation(worker)" class="quick-btn" :disabled="worker.status !== 'active'">
              📍 Konum
            </button>
            <button @click.stop="sendMessage(worker)" class="quick-btn">
              💬 Mesaj
            </button>
            <button @click.stop="scheduleTraining(worker)" class="quick-btn">
              📚 Eğitim
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Çalışan Listesi - Tablo Görünümü -->
    <div v-if="viewMode === 'table'" class="workers-table-container">
      <table class="workers-table">
        <thead>
          <tr>
            <th @click="setSortBy('name')" class="sortable">
              👤 İsim
              <span v-if="sortBy === 'name'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </span>
            </th>
            <th @click="setSortBy('workerId')" class="sortable">
              🆔 ID
              <span v-if="sortBy === 'workerId'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </span>
            </th>
            <th @click="setSortBy('department')" class="sortable">
              🏢 Departman
              <span v-if="sortBy === 'department'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </span>
            </th>
            <th>📍 Lokasyon</th>
            <th>📊 Durum</th>
            <th @click="setSortBy('compliance')" class="sortable">
              🎯 Uyum
              <span v-if="sortBy === 'compliance'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </span>
            </th>
            <th @click="setSortBy('violations')" class="sortable">
              ⚠️ İhlaller
              <span v-if="sortBy === 'violations'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </span>
            </th>
            <th>🦺 PPE</th>
            <th @click="setSortBy('lastSeen')" class="sortable">
              📅 Son Görülme
              <span v-if="sortBy === 'lastSeen'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '⬆️' : '⬇️' }}
              </span>
            </th>
            <th>⚙️ İşlemler</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="worker in paginatedWorkers" 
            :key="worker.id"
            class="worker-row"
            :class="{ 
              'has-violations': worker.recentViolations > 0,
              'inactive': worker.status !== 'active'
            }"
            @click="showWorkerDetails(worker)"
          >
            <td class="worker-name-cell">
              <div class="worker-avatar-small">
                <img 
                  v-if="worker.photo" 
                  :src="worker.photo" 
                  :alt="worker.name"
                  @error="handleImageError"
                >
                <div v-else class="avatar-placeholder-small">
                  {{ getInitials(worker.name) }}
                </div>
              </div>
              <div class="worker-name-info">
                <strong>{{ worker.name }}</strong>
                <small>{{ worker.position }}</small>
              </div>
            </td>
            <td>
              <code class="worker-id-code">{{ worker.workerId }}</code>
            </td>
            <td>{{ worker.department }}</td>
            <td>{{ worker.location }}</td>
            <td>
              <span class="status-badge" :class="worker.status">
                {{ getStatusText(worker.status) }}
              </span>
            </td>
            <td>
              <div class="compliance-cell">
                <span class="compliance-value" :class="getComplianceClass(worker.complianceRate)">
                  {{ worker.complianceRate }}%
                </span>
                <div class="mini-progress">
                  <div 
                    class="mini-progress-fill" 
                    :class="getComplianceClass(worker.complianceRate)"
                    :style="{ width: worker.complianceRate + '%' }"
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <span class="violations-count" :class="{ 'has-violations': worker.monthlyViolations > 0 }">
                {{ worker.monthlyViolations || 0 }}
              </span>
            </td>
            <td>
              <div class="ppe-icons">
                <span 
                  v-for="ppe in worker.assignedPPE.slice(0, 4)" 
                  :key="ppe.type"
                  class="ppe-icon"
                  :class="ppe.status"
                  :title="ppe.type"
                >
                  {{ getPPEIcon(ppe.type) }}
                </span>
                <span v-if="worker.assignedPPE.length > 4" class="ppe-more">
                  +{{ worker.assignedPPE.length - 4 }}
                </span>
              </div>
            </td>
            <td>
              <span class="last-seen" :class="getLastSeenClass(worker.lastSeen)">
                {{ formatLastSeen(worker.lastSeen) }}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button @click.stop="editWorker(worker)" class="table-action-btn" title="Düzenle">
                  ✏️
                </button>
                <button @click.stop="showWorkerHistory(worker)" class="table-action-btn" title="Geçmiş">
                  📊
                </button>
                <button @click.stop="assignPPE(worker)" class="table-action-btn" title="PPE">
                  🦺
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
        {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredWorkers.length) }} 
        / {{ filteredWorkers.length }} çalışan gösteriliyor
      </div>
      
      <div class="pagination-controls">
        <select v-model="itemsPerPage" @change="updatePagination" class="items-per-page">
          <option value="12">12 / sayfa</option>
          <option value="24">24 / sayfa</option>
          <option value="48">48 / sayfa</option>
          <option value="100">100 / sayfa</option>
        </select>
        
        <div class="page-buttons">
          <button 
            @click="goToPage(1)" 
            :disabled="currentPage === 1"
            class="page-btn"
          >
            ⏮️
          </button>
          <button 
            @click="goToPage(currentPage - 1)" 
            :disabled="currentPage === 1"
            class="page-btn"
          >
            ⬅️
          </button>
          
          <span class="page-info">
            {{ currentPage }} / {{ totalPages }}
          </span>
          
          <button 
            @click="goToPage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
            class="page-btn"
          >
            ➡️
          </button>
          <button 
            @click="goToPage(totalPages)" 
            :disabled="currentPage === totalPages"
            class="page-btn"
          >
            ⏭️
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner">🔄 Çalışanlar yükleniyor...</div>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && filteredWorkers.length === 0" class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>Çalışan Bulunamadı</h3>
      <p v-if="hasActiveFilters">Arama kriterlerinize uygun çalışan bulunamadı.</p>
      <p v-else>Henüz hiç çalışan eklenmemiş.</p>
      <div class="empty-actions">
        <button v-if="hasActiveFilters" @click="clearFilters" class="btn btn-primary">
          🔄 Filtreleri Temizle
        </button>
        <button v-else @click="showAddWorkerModal" class="btn btn-primary">
          ➕ İlk Çalışanı Ekle
        </button>
      </div>
    </div>

    <!-- Çalışan Ekleme/Düzenleme Modal -->
    <div v-if="showWorkerModal" class="modal-overlay" @click="closeWorkerModal">
      <div class="worker-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingWorker ? '✏️ Çalışan Düzenle' : '➕ Yeni Çalışan Ekle' }}</h3>
          <button @click="closeWorkerModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveWorker" class="worker-form">
            <div class="form-grid">
              <!-- Kişisel Bilgiler -->
              <div class="form-section">
                <h4>👤 Kişisel Bilgiler</h4>
                
                <div class="form-group">
                  <label>📷 Fotoğraf:</label>
                  <div class="photo-upload">
                    <div class="photo-preview">
                      <img 
                        v-if="workerForm.photo" 
                        :src="workerForm.photo" 
                        alt="Çalışan fotoğrafı"
                      >
                      <div v-else class="photo-placeholder">
                        📷
                      </div>
                    </div>
                    <input 
                      type="file" 
                      @change="handlePhotoUpload" 
                      accept="image/*"
                      class="photo-input"
                    >
                    <button type="button" @click="removePhoto" v-if="workerForm.photo" class="remove-photo">
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div class="form-group">
                  <label>👤 Ad Soyad: *</label>
                  <input 
                    v-model="workerForm.name" 
                    type="text" 
                    required 
                    class="form-control"
                    placeholder="Örn: Ahmet Yılmaz"
                  >
                </div>
                
                <div class="form-group">
                  <label>🆔 Çalışan ID: *</label>
                  <input 
                    v-model="workerForm.workerId" 
                    type="text" 
                    required 
                    class="form-control"
                    placeholder="Örn: EMP001"
                    :disabled="editingWorker"
                  >
                </div>
                
                <div class="form-group">
                  <label>📧 E-posta:</label>
                  <input 
                    v-model="workerForm.email" 
                    type="email" 
                    class="form-control"
                    placeholder="ornek@sirket.com"
                  >
                </div>
                
                <div class="form-group">
                  <label>📱 Telefon:</label>
                  <input 
                    v-model="workerForm.phone" 
                    type="tel" 
                    class="form-control"
                    placeholder="+90 555 123 45 67"
                  >
                </div>
              </div>
              
              <!-- İş Bilgileri -->
              <div class="form-section">
                <h4>🏢 İş Bilgileri</h4>
                
                <div class="form-group">
                  <label>🏢 Departman: *</label>
                  <select v-model="workerForm.department" required class="form-control">
                    <option value="">Departman Seçin</option>
                    <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>📍 Lokasyon: *</label>
                  <select v-model="workerForm.location" required class="form-control">
                    <option value="">Lokasyon Seçin</option>
                    <option v-for="location in locations" :key="location" :value="location">{{ location }}</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>👔 Pozisyon: *</label>
                  <input 
                    v-model="workerForm.position" 
                    type="text" 
                    required 
                    class="form-control"
                    placeholder="Örn: Güvenlik Uzmanı"
                  >
                </div>
                
                <div class="form-group">
                  <label>📅 İşe Başlama Tarihi: *</label>
                  <input 
                    v-model="workerForm.startDate" 
                    type="date" 
                    required 
                    class="form-control"
                  >
                </div>
                
                <div class="form-group">
                  <label>📊 Durum:</label>
                  <select v-model="workerForm.status" class="form-control">
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="training">Eğitimde</option>
                    <option value="suspended">Askıda</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>👥 Yönetici:</label>
                  <select v-model="workerForm.managerId" class="form-control">
                    <option value="">Yönetici Seçin</option>
                    <option v-for="manager in managers" :key="manager.id" :value="manager.id">
                      {{ manager.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- PPE Atamaları -->
            <div class="form-section full-width">
              <h4>🦺 PPE Atamaları</h4>
              <div class="ppe-assignment">
                <div 
                  v-for="ppe in availablePPE" 
                  :key="ppe.type"
                  class="ppe-item"
                >
                  <label class="ppe-checkbox">
                    <input 
                      type="checkbox" 
                      :value="ppe.type"
                      v-model="workerForm.assignedPPE"
                      @change="updatePPEAssignment"
                    >
                    <span class="ppe-label">
                      <span class="ppe-icon">{{ ppe.icon }}</span>
                      <span class="ppe-name">{{ ppe.type }}</span>
                      <span class="ppe-desc">{{ ppe.description }}</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- Notlar -->
            <div class="form-section full-width">
              <h4>📝 Notlar</h4>
              <div class="form-group">
                <textarea 
                  v-model="workerForm.notes" 
                  class="form-control"
                  rows="3"
                  placeholder="Çalışan hakkında notlar..."
                ></textarea>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button @click="saveWorker" :disabled="isSaving" class="btn btn-primary">
            <span v-if="isSaving">💾 Kaydediliyor...</span>
            <span v-else>💾 {{ editingWorker ? 'Güncelle' : 'Kaydet' }}</span>
          </button>
          <button @click="closeWorkerModal" class="btn btn-secondary">❌ İptal</button>
        </div>
      </div>
    </div>

    <!-- Çalışan Detay Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="detail-modal" @click.stop>
        <div class="modal-header">
          <div class="detail-header-info">
            <div class="detail-avatar">
              <img 
                v-if="selectedWorker?.photo" 
                :src="selectedWorker.photo" 
                :alt="selectedWorker.name"
              >
              <div v-else class="avatar-placeholder-large">
                {{ getInitials(selectedWorker?.name) }}
              </div>
            </div>
            <div class="detail-basic-info">
              <h3>{{ selectedWorker?.name }}</h3>
              <p class="detail-worker-id">ID: {{ selectedWorker?.workerId }}</p>
              <div class="detail-status" :class="selectedWorker?.status">
                <span class="status-dot"></span>
                {{ getStatusText(selectedWorker?.status) }}
              </div>
            </div>
          </div>
          <button @click="closeDetailModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="detail-tabs">
            <button 
              v-for="tab in detailTabs" 
              :key="tab.id"
              @click="activeDetailTab = tab.id"
              :class="['tab-btn', { 'active': activeDetailTab === tab.id }]"
            >
              {{ tab.icon }} {{ tab.label }}
            </button>
          </div>
          
          <div class="detail-content">
            <!-- Genel Bilgiler Tab -->
            <div v-if="activeDetailTab === 'general'" class="tab-content">
              <div class="info-grid">
                <div class="info-section">
                  <h4>👤 Kişisel Bilgiler</h4>
                  <div class="info-list">
                    <div class="info-item">
                      <span class="info-label">📧 E-posta:</span>
                      <span class="info-value">{{ selectedWorker?.email || 'Belirtilmemiş' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">📱 Telefon:</span>
                      <span class="info-value">{{ selectedWorker?.phone || 'Belirtilmemiş' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">📅 İşe Başlama:</span>
                      <span class="info-value">{{ formatDate(selectedWorker?.startDate) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">⏱️ Çalışma Süresi:</span>
                      <span class="info-value">{{ calculateWorkDuration(selectedWorker?.startDate) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-section">
                  <h4>🏢 İş Bilgileri</h4>
                  <div class="info-list">
                    <div class="info-item">
                      <span class="info-label">🏢 Departman:</span>
                      <span class="info-value">{{ selectedWorker?.department }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">📍 Lokasyon:</span>
                      <span class="info-value">{{ selectedWorker?.location }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">👔 Pozisyon:</span>
                      <span class="info-value">{{ selectedWorker?.position }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">👥 Yönetici:</span>
                      <span class="info-value">{{ getManagerName(selectedWorker?.managerId) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="info-section full-width">
                <h4>📝 Notlar</h4>
                <div class="notes-content">
                  {{ selectedWorker?.notes || 'Henüz not eklenmemiş.' }}
                </div>
              </div>
            </div>
            
            <!-- PPE Tab -->
            <div v-if="activeDetailTab === 'ppe'" class="tab-content">
              <div class="ppe-detail-section">
                <div class="section-header">
                  <h4>🦺 Atanmış PPE Ekipmanları</h4>
                  <button @click="assignPPE(selectedWorker)" class="btn btn-primary">
                    ➕ PPE Ata
                  </button>
                </div>
                
                <div class="ppe-grid">
                  <div 
                    v-for="ppe in selectedWorker?.assignedPPE" 
                    :key="ppe.type"
                    class="ppe-detail-card"
                    :class="ppe.status"
                  >
                    <div class="ppe-card-header">
                      <span class="ppe-icon-large">{{ getPPEIcon(ppe.type) }}</span>
                      <div class="ppe-card-info">
                        <h5>{{ ppe.type }}</h5>
                        <p class="ppe-status">{{ ppe.status === 'assigned' ? 'Atanmış' : 'Eksik' }}</p>
                      </div>
                    </div>
                    
                    <div class="ppe-card-details">
                      <div class="ppe-detail-item">
                        <span class="detail-label">📅 Atanma Tarihi:</span>
                        <span class="detail-value">{{ formatDate(ppe.assignedDate) }}</span>
                      </div>
                      <div class="ppe-detail-item">
                        <span class="detail-label">⏰ Son Kontrol:</span>
                        <span class="detail-value">{{ formatDate(ppe.lastCheck) }}</span>
                      </div>
                      <div class="ppe-detail-item">
                        <span class="detail-label">📊 Durum:</span>
                        <span class="detail-value" :class="ppe.condition">
                          {{ ppe.condition || 'İyi' }}
                        </span>
                      </div>
                    </div>
                    
                    <div class="ppe-card-actions">
                      <button @click="updatePPEStatus(selectedWorker, ppe)" class="btn btn-sm">
                        ✏️ Güncelle
                      </button>
                      <button @click="removePPE(selectedWorker, ppe)" class="btn btn-sm btn-danger">
                        🗑️ Kaldır
                      </button>
                    </div>
                  </div>
                </div>
                
                <div v-if="!selectedWorker?.assignedPPE?.length" class="empty-ppe">
                  <div class="empty-icon">🦺</div>
                  <p>Bu çalışana henüz PPE atanmamış.</p>
                  <button @click="assignPPE(selectedWorker)" class="btn btn-primary">
                    ➕ İlk PPE'yi Ata
                  </button>
                </div>
              </div>
            </div>
            
            <!-- İstatistikler Tab -->
            <div v-if="activeDetailTab === 'stats'" class="tab-content">
              <div class="stats-overview">
                <div class="stat-card-small">
                  <div class="stat-icon">🎯</div>
                  <div class="stat-content">
                    <div class="stat-value">{{ selectedWorker?.complianceRate }}%</div>
                    <div class="stat-label">Uyum Oranı</div>
                  </div>
                </div>
                
                <div class="stat-card-small">
                  <div class="stat-icon">⚠️</div>
                  <div class="stat-content">
                    <div class="stat-value">{{ selectedWorker?.monthlyViolations || 0 }}</div>
                    <div class="stat-label">Bu Ay İhlal</div>
                  </div>
                </div>
                
                <div class="stat-card-small">
                  <div class="stat-icon">🏆</div>
                  <div class="stat-content">
                    <div class="stat-value">{{ selectedWorker?.safetyScore || 0 }}</div>
                    <div class="stat-label">Güvenlik Skoru</div>
                  </div>
                </div>
                
                <div class="stat-card-small">
                  <div class="stat-icon">📚</div>
                  <div class="stat-content">
                    <div class="stat-value">{{ selectedWorker?.completedTrainings || 0 }}</div>
                    <div class="stat-label">Tamamlanan Eğitim</div>
                  </div>
                </div>
              </div>
              
              <!-- Aylık Trend Grafik Alanı -->
              <div class="chart-section">
                <h4>📈 Aylık Uyum Trendi</h4>
                <div class="chart-placeholder">
                  <canvas ref="complianceChart" width="400" height="200"></canvas>
                </div>
              </div>
              
              <!-- Son İhlaller -->
              <div class="recent-violations">
                <h4>⚠️ Son İhlaller</h4>
                <div v-if="selectedWorker?.recentViolations?.length" class="violations-list">
                  <div 
                    v-for="violation in selectedWorker.recentViolations.slice(0, 5)" 
                    :key="violation.id"
                    class="violation-item"
                  >
                    <div class="violation-date">
                      {{ formatDateTime(violation.timestamp) }}
                    </div>
                    <div class="violation-details">
                      <strong>{{ violation.type }}</strong>
                      <p>{{ violation.description }}</p>
                      <span class="violation-location">📍 {{ violation.location }}</span>
                    </div>
                    <div class="violation-status" :class="violation.status">
                      {{ violation.status === 'resolved' ? 'Çözüldü' : 'Açık' }}
                    </div>
                  </div>
                </div>
                <div v-else class="no-violations">
                  <p>✅ Son 30 günde ihlal kaydı yok!</p>
                </div>
              </div>
            </div>
            
            <!-- Geçmiş Tab -->
            <div v-if="activeDetailTab === 'history'" class="tab-content">
              <div class="history-filters">
                <select v-model="historyFilter" @change="loadWorkerHistory" class="filter-select">
                  <option value="all">Tüm Aktiviteler</option>
                  <option value="violations">İhlaller</option>
                  <option value="trainings">Eğitimler</option>
                  <option value="ppe">PPE Değişiklikleri</option>
                  <option value="status">Durum Değişiklikleri</option>
                </select>
                
                <input 
                  v-model="historyDateFrom" 
                  type="date" 
                  class="date-input"
                  @change="loadWorkerHistory"
                >
                <span>-</span>
                <input 
                  v-model="historyDateTo" 
                  type="date" 
                  class="date-input"
                  @change="loadWorkerHistory"
                >
              </div>
              
              <div class="history-timeline">
                <div 
                  v-for="event in workerHistory" 
                  :key="event.id"
                  class="history-item"
                  :class="event.type"
                >
                  <div class="history-date">
                    {{ formatDateTime(event.timestamp) }}
                  </div>
                  <div class="history-icon">
                    {{ getHistoryIcon(event.type) }}
                  </div>
                  <div class="history-content">
                    <h5>{{ event.title }}</h5>
                    <p>{{ event.description }}</p>
                    <div v-if="event.details" class="history-details">
                      <span v-for="(value, key) in event.details" :key="key" class="detail-tag">
                        {{ key }}: {{ value }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-if="!workerHistory.length" class="empty-history">
                <div class="empty-icon">📋</div>
                <p>Seçilen kriterlere uygun geçmiş kaydı bulunamadı.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="editWorker(selectedWorker)" class="btn btn-primary">
            ✏️ Düzenle
          </button>
          <button @click="generateWorkerReport(selectedWorker)" class="btn btn-secondary">
            📄 Rapor Oluştur
          </button>
          <button @click="closeDetailModal" class="btn btn-outline">
            ❌ Kapat
          </button>
        </div>
      </div>
    </div>

    <!-- PPE Atama Modal -->
    <div v-if="showPPEModal" class="modal-overlay" @click="closePPEModal">
      <div class="ppe-modal" @click.stop>
        <div class="modal-header">
          <h3>🦺 PPE Atama - {{ selectedWorkerForPPE?.name }}</h3>
          <button @click="closePPEModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="ppe-assignment-form">
            <div class="current-ppe">
              <h4>📋 Mevcut PPE Atamaları</h4>
              <div class="current-ppe-list">
                <div 
                  v-for="ppe in selectedWorkerForPPE?.assignedPPE" 
                  :key="ppe.type"
                  class="current-ppe-item"
                >
                  <span class="ppe-icon">{{ getPPEIcon(ppe.type) }}</span>
                  <span class="ppe-name">{{ ppe.type }}</span>
                  <span class="ppe-status" :class="ppe.status">{{ ppe.status }}</span>
                  <button @click="removePPEFromWorker(ppe)" class="remove-ppe-btn">🗑️</button>
                </div>
              </div>
            </div>
            
            <div class="available-ppe">
              <h4>➕ Yeni PPE Ata</h4>
              <div class="ppe-selection">
                <div 
                  v-for="ppe in availablePPEForAssignment" 
                  :key="ppe.type"
                  class="ppe-option"
                  :class="{ 'selected': selectedPPETypes.includes(ppe.type) }"
                  @click="togglePPESelection(ppe.type)"
                >
                  <div class="ppe-option-content">
                    <span class="ppe-icon-large">{{ ppe.icon }}</span>
                    <div class="ppe-option-info">
                      <h5>{{ ppe.type }}</h5>
                      <p>{{ ppe.description }}</p>
                      <span class="ppe-category">{{ ppe.category }}</span>
                    </div>
                  </div>
                  <div class="ppe-option-checkbox">
                    <input 
                      type="checkbox" 
                      :checked="selectedPPETypes.includes(ppe.type)"
                      @change="togglePPESelection(ppe.type)"
                    >
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="selectedPPETypes.length > 0" class="ppe-assignment-details">
              <h4>📝 Atama Detayları</h4>
              <div class="assignment-form">
                <div class="form-group">
                  <label>📅 Atama Tarihi:</label>
                  <input v-model="ppeAssignmentDate" type="date" class="form-control">
                </div>
                <div class="form-group">
                  <label>📝 Notlar:</label>
                  <textarea 
                    v-model="ppeAssignmentNotes" 
                    class="form-control" 
                    rows="3"
                    placeholder="PPE atama notları..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            @click="savePPEAssignment" 
            :disabled="selectedPPETypes.length === 0 || isSaving"
            class="btn btn-primary"
          >
            <span v-if="isSaving">💾 Kaydediliyor...</span>
            <span v-else>💾 PPE Ata ({{ selectedPPETypes.length }})</span>
          </button>
          <button @click="closePPEModal" class="btn btn-secondary">❌ İptal</button>
        </div>
      </div>
    </div>

    <!-- Dosya İçe Aktarma Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click="closeImportModal">
      <div class="import-modal" @click.stop>
        <div class="modal-header">
          <h3>📥 Çalışan Listesi İçe Aktar</h3>
          <button @click="closeImportModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="import-steps">
            <div class="step" :class="{ 'active': importStep === 1 }">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>📄 Dosya Seç</h4>
                <p>Excel (.xlsx) veya CSV dosyası seçin</p>
              </div>
            </div>
            
            <div class="step" :class="{ 'active': importStep === 2 }">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>🔍 Önizleme</h4>
                <p>Verileri kontrol edin</p>
              </div>
            </div>
            
            <div class="step" :class="{ 'active': importStep === 3 }">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>💾 İçe Aktar</h4>
                <p>Verileri sisteme kaydedin</p>
              </div>
            </div>
          </div>
          
          <div v-if="importStep === 1" class="import-step-1">
            <div class="file-upload-area" @drop="handleFileDrop" @dragover.prevent @dragenter.prevent>
              <div class="upload-icon">📁</div>
              <h4>Dosyayı sürükleyip bırakın veya seçin</h4>
              <p>Desteklenen formatlar: .xlsx, .csv</p>
              <input 
                type="file" 
                @change="handleFileSelect" 
                accept=".xlsx,.csv"
                class="file-input"
                ref="fileInput"
              >
              <button @click="$refs.fileInput.click()" class="btn btn-primary">
                📁 Dosya Seç
              </button>
            </div>
            
            <div class="template-download">
              <h4>📋 Şablon İndir</h4>
              <p>Doğru formatta dosya hazırlamak için şablonu indirin</p>
              <button @click="downloadTemplate" class="btn btn-outline">
                📥 Excel Şablonu İndir
              </button>
            </div>
          </div>
          
          <div v-if="importStep === 2" class="import-step-2">
            <div class="import-preview">
              <h4>📊 Veri Önizleme</h4>
              <div class="preview-stats">
                <span class="preview-stat">
                  📊 {{ importData.length }} kayıt bulundu
                </span>
                <span class="preview-stat valid">
                  ✅ {{ validRecords }} geçerli
                </span>
                <span class="preview-stat invalid">
                  ❌ {{ invalidRecords }} hatalı
                </span>
              </div>
              
              <div class="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Durum</th>
                      <th>Ad Soyad</th>
                      <th>Çalışan ID</th>
                      <th>Departman</th>
                      <th>Pozisyon</th>
                      <th>Hata</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="(record, index) in importData.slice(0, 10)" 
                      :key="index"
                      :class="{ 'invalid': record.errors?.length > 0 }"
                    >
                      <td>
                        <span v-if="record.errors?.length > 0" class="status-error">❌</span>
                        <span v-else class="status-valid">✅</span>
                      </td>
                      <td>{{ record.name }}</td>
                      <td>{{ record.workerId }}</td>
                      <td>{{ record.department }}</td>
                      <td>{{ record.position }}</td>
                      <td>
                        <span v-if="record.errors?.length > 0" class="error-text">
                          {{ record.errors.join(', ') }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div v-if="importStep === 3" class="import-step-3">
            <div class="import-progress">
              <h4>💾 İçe Aktarılıyor...</h4>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: importProgress + '%' }"></div>
              </div>
              <p>{{ importedCount }} / {{ validRecords }} kayıt işlendi</p>
            </div>
            
            <div v-if="importCompleted" class="import-results">
              <div class="result-summary">
                <div class="result-item success">
                  <span class="result-icon">✅</span>
                  <span class="result-text">{{ successfulImports }} başarılı</span>
                </div>
                <div class="result-item error">
                  <span class="result-icon">❌</span>
                  <span class="result-text">{{ failedImports }} başarısız</span>
                </div>
              </div>
              
              <div v-if="importErrors.length > 0" class="import-errors">
                <h5>❌ Hata Detayları</h5>
                <div class="error-list">
                  <div v-for="error in importErrors" :key="error.row" class="error-item">
                    <strong>Satır {{ error.row }}:</strong> {{ error.message }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            v-if="importStep === 1" 
            @click="closeImportModal" 
            class="btn btn-secondary"
          >
            ❌ İptal
          </button>
          
          <button 
            v-if="importStep === 2" 
            @click="importStep = 1" 
            class="btn btn-secondary"
          >
            ⬅️ Geri
          </button>
          
          <button 
            v-if="importStep === 2 && validRecords > 0" 
            @click="startImport" 
            class="btn btn-primary"
          >
            💾 İçe Aktar ({{ validRecords }} kayıt)
          </button>
          
          <button 
            v-if="importStep === 3 && importCompleted" 
            @click="closeImportModal" 
            class="btn btn-primary"
          >
            ✅ Tamamla
          </button>
        </div>
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
  name: 'WorkersView',
  data() {
    return {
      // Loading states
      isLoading: false,
      isSaving: false,
      
      // Arama ve filtreleme
      searchQuery: '',
      selectedDepartment: '',
      selectedLocation: '',
      selectedStatus: '',
      selectedCompliance: '',
      sortBy: 'name',
      sortOrder: 'asc',
      
      // Görünüm
      viewMode: 'cards', // cards, table
      
      // Sayfalama
      currentPage: 1,
      itemsPerPage: 12,
      
      // Veri
      workers: [],
      filteredWorkers: [],
      departments: [],
      locations: [],
      managers: [],
      
      // İstatistikler
      totalWorkers: 0,
      activeWorkers: 0,
      averageCompliance: 0,
      totalViolations: 0,
      newWorkersThisMonth: 0,
      complianceChange: 0,
      violationChange: 0,
      
      // Modal states
      showWorkerModal: false,
      showDetailModal: false,
      showPPEModal: false,
      showImportModal: false,
      
      // Düzenleme
      editingWorker: null,
      selectedWorker: null,
      selectedWorkerForPPE: null,
      
      // Form data
      workerForm: {
        name: '',
        workerId: '',
        email: '',
        phone: '',
        department: '',
        location: '',
        position: '',
        startDate: '',
        status: 'active',
        managerId: '',
        assignedPPE: [],
        notes: '',
        photo: null
      },
      
      // PPE
      availablePPE: [
        { type: 'Baret', icon: '⛑️', description: 'Kafa koruma bareti', category: 'Kafa Koruma' },
        { type: 'Gözlük', icon: '🥽', description: 'Güvenlik gözlüğü', category: 'Göz Koruma' },
        { type: 'Eldiven', icon: '🧤', description: 'İş eldiveni', category: 'El Koruma' },
        { type: 'Yelek', icon: '🦺', description: 'Güvenlik yeleği', category: 'Vücut Koruma' },
        { type: 'Ayakkabı', icon: '👷', description: 'Güvenlik ayakkabısı', category: 'Ayak Koruma' },
        { type: 'Maske', icon: '😷', description: 'Solunum maskesi', category: 'Solunum Koruma' },
        { type: 'Kulaklık', icon: '🎧', description: 'Gürültü önleyici kulaklık', category: 'İşitme Koruma' }
      ],
      selectedPPETypes: [],
      ppeAssignmentDate: '',
      ppeAssignmentNotes: '',
      
      // Detay modal
      activeDetailTab: 'general',
      detailTabs: [
        { id: 'general', label: 'Genel', icon: '👤' },
        { id: 'ppe', label: 'PPE', icon: '🦺' },
        { id: 'stats', label: 'İstatistikler', icon: '📊' },
        { id: 'history', label: 'Geçmiş', icon: '📋' }
      ],
      
      // Geçmiş
      workerHistory: [],
      historyFilter: 'all',
      historyDateFrom: '',
      historyDateTo: '',
            
      // İçe aktarma
      importStep: 1,
      importData: [],
      importProgress: 0,
      importedCount: 0,
      importCompleted: false,
      successfulImports: 0,
      failedImports: 0,
      importErrors: [],
      
      // Diğer
      activeActionMenu: null,
      message: '',
      messageType: 'success'
    }
  },
  
  computed: {
    paginatedWorkers() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredWorkers.slice(start, end)
    },
    
    totalPages() {
      return Math.ceil(this.filteredWorkers.length / this.itemsPerPage)
    },
    
    hasActiveFilters() {
      return this.searchQuery || this.selectedDepartment || 
             this.selectedLocation || this.selectedStatus || 
             this.selectedCompliance
    },
    
    validRecords() {
      return this.importData.filter(record => !record.errors?.length).length
    },
    
    invalidRecords() {
      return this.importData.filter(record => record.errors?.length > 0).length
    },
    
    availablePPEForAssignment() {
      if (!this.selectedWorkerForPPE) return this.availablePPE
      
      const assignedTypes = this.selectedWorkerForPPE.assignedPPE?.map(ppe => ppe.type) || []
      return this.availablePPE.filter(ppe => !assignedTypes.includes(ppe.type))
    }
  },
  
  mounted() {
    this.loadWorkers()
    this.loadDepartments()
    this.loadLocations()
    this.loadManagers()
    this.loadStatistics()
    
    // Dış tıklamaları dinle
    document.addEventListener('click', this.handleOutsideClick)
  },
  
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
  },
  
  methods: {
    async loadWorkers() {
      this.isLoading = true
      try {
        const response = await fetch('http://localhost:5001/api/ppe/workers')
        if (response.ok) {
          this.workers = await response.json()
          this.applyFilters()
        }
      } catch (error) {
        console.error('Çalışanlar yüklenemedi:', error)
        this.showMessage('Çalışanlar yüklenemedi! ❌', 'error')
      } finally {
        this.isLoading = false
      }
    },
    
    async loadDepartments() {
      try {
        const response = await fetch('http://localhost:5001/api/ppe/departments')
        if (response.ok) {
          this.departments = await response.json()
        }
      } catch (error) {
        console.error('Departmanlar yüklenemedi:', error)
      }
    },
    
    async loadLocations() {
      try {
        const response = await fetch('http://localhost:5001/api/ppe/locations')
        if (response.ok) {
          this.locations = await response.json()
        }
      } catch (error) {
        console.error('Lokasyonlar yüklenemedi:', error)
      }
    },
    
    async loadManagers() {
      try {
        const response = await fetch('http://localhost:5001/api/ppe/workers?role=manager')
        if (response.ok) {
          this.managers = await response.json()
        }
      } catch (error) {
        console.error('Yöneticiler yüklenemedi:', error)
      }
    },
    
    async loadStatistics() {
      try {
        const response = await fetch('http://localhost:5001/api/ppe/workers/statistics')
        if (response.ok) {
          const stats = await response.json()
          this.totalWorkers = stats.totalWorkers
          this.activeWorkers = stats.activeWorkers
          this.averageCompliance = stats.averageCompliance
          this.totalViolations = stats.totalViolations
          this.newWorkersThisMonth = stats.newWorkersThisMonth
          this.complianceChange = stats.complianceChange
          this.violationChange = stats.violationChange
        }
      } catch (error) {
        console.error('İstatistikler yüklenemedi:', error)
      }
    },
    
    // Arama ve filtreleme
    searchWorkers() {
      this.applyFilters()
    },
    
    applyFilters() {
      let filtered = [...this.workers]
      
      // Arama
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(worker => 
          worker.name.toLowerCase().includes(query) ||
          worker.workerId.toLowerCase().includes(query) ||
          worker.department.toLowerCase().includes(query) ||
          worker.position.toLowerCase().includes(query)
        )
      }
      
      // Departman filtresi
      if (this.selectedDepartment) {
        filtered = filtered.filter(worker => worker.department === this.selectedDepartment)
      }
      
      // Lokasyon filtresi
      if (this.selectedLocation) {
        filtered = filtered.filter(worker => worker.location === this.selectedLocation)
      }
      
      // Durum filtresi
      if (this.selectedStatus) {
        filtered = filtered.filter(worker => worker.status === this.selectedStatus)
      }
      
      // Uyum filtresi
      if (this.selectedCompliance) {
        filtered = filtered.filter(worker => {
          const compliance = worker.complianceRate
          switch (this.selectedCompliance) {
            case 'excellent': return compliance >= 90
            case 'good': return compliance >= 75 && compliance < 90
            case 'average': return compliance >= 60 && compliance < 75
            case 'poor': return compliance < 60
            default: return true
          }
        })
      }
      
      this.filteredWorkers = filtered
      this.applySorting()
      this.currentPage = 1
    },
    
    applySorting() {
      this.filteredWorkers.sort((a, b) => {
        let valueA = a[this.sortBy]
        let valueB = b[this.sortBy]
        
        // Özel sıralama kuralları
        if (this.sortBy === 'compliance') {
          valueA = a.complianceRate
          valueB = b.complianceRate
        } else if (this.sortBy === 'violations') {
          valueA = a.monthlyViolations || 0
          valueB = b.monthlyViolations || 0
        } else if (this.sortBy === 'lastSeen') {
          valueA = new Date(a.lastSeen || 0)
          valueB = new Date(b.lastSeen || 0)
        }
        
        if (typeof valueA === 'string') {
          valueA = valueA.toLowerCase()
          valueB = valueB.toLowerCase()
        }
        
        if (this.sortOrder === 'asc') {
          return valueA > valueB ? 1 : -1
        } else {
          return valueA < valueB ? 1 : -1
        }
      })
    },
    
    setSortBy(field) {
      if (this.sortBy === field) {
        this.toggleSortOrder()
      } else {
        this.sortBy = field
        this.sortOrder = 'asc'
      }
      this.applySorting()
    },
    
    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      this.applySorting()
    },
    
    clearFilters() {
      this.searchQuery = ''
      this.selectedDepartment = ''
      this.selectedLocation = ''
      this.selectedStatus = ''
      this.selectedCompliance = ''
      this.applyFilters()
    },
    
    // Sayfalama
    goToPage(page) {
      this.currentPage = Math.max(1, Math.min(page, this.totalPages))
    },
    
    updatePagination() {
      this.currentPage = 1
    },
    
    // Modal işlemleri
    showAddWorkerModal() {
      this.editingWorker = null
      this.resetWorkerForm()
      this.showWorkerModal = true
    },
    
    editWorker(worker) {
      this.editingWorker = worker
      this.workerForm = {
        name: worker.name,
        workerId: worker.workerId,
        email: worker.email || '',
        phone: worker.phone || '',
        department: worker.department,
        location: worker.location,
        position: worker.position,
        startDate: worker.startDate,
        status: worker.status,
        managerId: worker.managerId || '',
        assignedPPE: worker.assignedPPE?.map(ppe => ppe.type) || [],
        notes: worker.notes || '',
        photo: worker.photo
      }
      this.showWorkerModal = true
    },
    
    closeWorkerModal() {
      this.showWorkerModal = false
      this.editingWorker = null
      this.resetWorkerForm()
    },
    
    resetWorkerForm() {
      this.workerForm = {
        name: '',
        workerId: '',
        email: '',
        phone: '',
        department: '',
        location: '',
        position: '',
        startDate: '',
        status: 'active',
        managerId: '',
        assignedPPE: [],
        notes: '',
        photo: null
      }
    },
    
    async saveWorker() {
      this.isSaving = true
      
      try {
        const workerData = {
          ...this.workerForm,
          assignedPPE: this.workerForm.assignedPPE.map(type => ({
            type,
            status: 'assigned',
            assignedDate: new Date().toISOString(),
            lastCheck: new Date().toISOString()
          }))
        }
        
        let response
        if (this.editingWorker) {
          response = await fetch(`http://localhost:5001/api/ppe/workers/${this.editingWorker.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workerData)
          })
        } else {
          response = await fetch('http://localhost:5001/api/ppe/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workerData)
          })
        }
        
        if (response.ok) {
          this.showMessage(
            this.editingWorker ? 'Çalışan güncellendi! ✅' : 'Çalışan eklendi! ✅', 
            'success'
          )
          this.closeWorkerModal()
          this.loadWorkers()
          this.loadStatistics()
        }
      } catch (error) {
        console.error('Çalışan kaydedilemedi:', error)
        this.showMessage('İşlem başarısız! ❌', 'error')
      } finally {
        this.isSaving = false
      }
    },
    
    // Çalışan detayları
    showWorkerDetails(worker) {
      this.selectedWorker = worker
      this.activeDetailTab = 'general'
      this.showDetailModal = true
      this.loadWorkerHistory()
    },
    
    closeDetailModal() {
      this.showDetailModal = false
      this.selectedWorker = null
      this.workerHistory = []
    },
    
    async loadWorkerHistory() {
      if (!this.selectedWorker) return
      
      try {
        const params = new URLSearchParams()
        params.append('workerId', this.selectedWorker.id)
        params.append('filter', this.historyFilter)
        if (this.historyDateFrom) params.append('dateFrom', this.historyDateFrom)
        if (this.historyDateTo) params.append('dateTo', this.historyDateTo)
        
        const response = await fetch(`http://localhost:5001/api/ppe/workers/history?${params}`)
        if (response.ok) {
          this.workerHistory = await response.json()
        }
      } catch (error) {
        console.error('Çalışan geçmişi yüklenemedi:', error)
      }
    },
    
    // PPE yönetimi
    assignPPE(worker) {
      this.selectedWorkerForPPE = worker
      this.selectedPPETypes = []
      this.ppeAssignmentDate = new Date().toISOString().split('T')[0]
      this.ppeAssignmentNotes = ''
      this.showPPEModal = true
    },
    
    closePPEModal() {
      this.showPPEModal = false
      this.selectedWorkerForPPE = null
      this.selectedPPETypes = []
    },
    
    togglePPESelection(type) {
      const index = this.selectedPPETypes.indexOf(type)
      if (index > -1) {
        this.selectedPPETypes.splice(index, 1)
      } else {
        this.selectedPPETypes.push(type)
      }
    },
    
    async savePPEAssignment() {
      this.isSaving = true
      
      try {
        const assignmentData = {
          workerId: this.selectedWorkerForPPE.id,
          ppeTypes: this.selectedPPETypes,
          assignmentDate: this.ppeAssignmentDate,
          notes: this.ppeAssignmentNotes
        }
        
        const response = await fetch('http://localhost:5001/api/ppe/workers/assign-ppe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentData)
        })
        
        if (response.ok) {
          this.showMessage(`${this.selectedPPETypes.length} PPE atandı! 🦺`, 'success')
          this.closePPEModal()
          this.loadWorkers()
        }
      } catch (error) {
        console.error('PPE atanamadı:', error)
        this.showMessage('PPE atama başarısız! ❌', 'error')
      } finally {
        this.isSaving = false
      }
    },
    
    async removePPE(worker, ppe) {
      try {
        const response = await fetch(`http://localhost:5001/api/ppe/workers/${worker.id}/ppe/${ppe.type}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          this.showMessage(`${ppe.type} kaldırıldı! 🗑️`, 'success')
          this.loadWorkers()
        }
      } catch (error) {
        console.error('PPE kaldırılamadı:', error)
        this.showMessage('PPE kaldırma başarısız! ❌', 'error')
      }
    },
    
    removePPEFromWorker(ppe) {
      this.removePPE(this.selectedWorkerForPPE, ppe)
    },
    
    updatePPEAssignment() {
      // PPE atama güncelleme mantığı
    },
    
    async updatePPEStatus(worker, ppe) {
      // PPE durum güncelleme modal'ı açılabilir
      this.showMessage('PPE güncelleme özelliği geliştiriliyor... 🔧', 'info')
    },
    
    // Dosya işlemleri
    handlePhotoUpload(event) {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.workerForm.photo = e.target.result
        }
        reader.readAsDataURL(file)
      }
    },
    
    removePhoto() {
      this.workerForm.photo = null
    },
    
    handleImageError(event) {
      event.target.style.display = 'none'
    },
    
    // İçe/Dışa aktarma
    async exportWorkers() {
      try {
        const response = await fetch('http://localhost:5001/api/ppe/workers/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              department: this.selectedDepartment,
              location: this.selectedLocation,
              status: this.selectedStatus
            }
          })
        })
        
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `calisanlar_${new Date().toISOString().split('T')[0]}.xlsx`
          link.click()
          window.URL.revokeObjectURL(url)
          this.showMessage('Çalışan listesi dışa aktarıldı! 📊', 'success')
        }
      } catch (error) {
        console.error('Dışa aktarma hatası:', error)
        this.showMessage('Dışa aktarma başarısız! ❌', 'error')
      }
    },
    
    importWorkers() {
      this.showImportModal = true
      this.importStep = 1
      this.importData = []
    },
    
    closeImportModal() {
      this.showImportModal = false
      this.importStep = 1
      this.importData = []
      this.importProgress = 0
      this.importCompleted = false
    },
    
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.processImportFile(file)
      }
    },
    
    handleFileDrop(event) {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file) {
        this.processImportFile(file)
      }
    },
    
    async processImportFile(file) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('http://localhost:5001/api/ppe/workers/import/preview', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          this.importData = await response.json()
          this.importStep = 2
        }
      } catch (error) {
        console.error('Dosya işlenemedi:', error)
        this.showMessage('Dosya işlenemedi! ❌', 'error')
      }
    },
    
    async downloadTemplate() {
      try {
        const response = await fetch('http://localhost:5001/api/ppe/workers/import/template')
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'calisanlar_sablonu.xlsx'
          link.click()
          window.URL.revokeObjectURL(url)
        }
      } catch (error) {
        console.error('Şablon indirilemedi:', error)
        this.showMessage('Şablon indirilemedi! ❌', 'error')
      }
    },
    
    async startImport() {
      this.importStep = 3
      this.importProgress = 0
      this.importedCount = 0
      this.successfulImports = 0
      this.failedImports = 0
      this.importErrors = []
      
      const validRecords = this.importData.filter(record => !record.errors?.length)
      
      try {
        const response = await fetch('http://localhost:5001/api/ppe/workers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workers: validRecords })
        })
        
        if (response.ok) {
          // Simüle edilmiş progress
          const interval = setInterval(() => {
            this.importedCount++
            this.importProgress = (this.importedCount / validRecords.length) * 100
            
            if (this.importedCount >= validRecords.length) {
              clearInterval(interval)
              this.importCompleted = true
              this.successfulImports = validRecords.length
              this.loadWorkers()
              this.loadStatistics()
              this.showMessage(`${this.successfulImports} çalışan başarıyla içe aktarıldı! ✅`, 'success')
            }
          }, 100)
        }
      } catch (error) {
        console.error('İçe aktarma hatası:', error)
        this.showMessage('İçe aktarma başarısız! ❌', 'error')
      }
    },
    
    // Diğer işlemler
    toggleActionMenu(workerId) {
      this.activeActionMenu = this.activeActionMenu === workerId ? null : workerId
    },
    
    handleOutsideClick(event) {
      if (!event.target.closest('.action-menu')) {
        this.activeActionMenu = null
      }
    },
    
    async sendNotification(worker) {
      this.showMessage(`${worker.name} bildirim gönderildi! 📱`, 'success')
    },
    
    async generateReport(worker) {
      try {
        const response = await fetch(`http://localhost:5001/api/ppe/workers/${worker.id}/report`, {
          method: 'POST'
        })
        
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${worker.name}_raporu.pdf`
          link.click()
          window.URL.revokeObjectURL(url)
          this.showMessage('Rapor oluşturuldu! 📄', 'success')
        }
      } catch (error) {
        console.error('Rapor oluşturulamadı:', error)
        this.showMessage('Rapor oluşturulamadı! ❌', 'error')
      }
    },
    
    async generateWorkerReport(worker) {
      this.generateReport(worker)
    },
    
    async deactivateWorker(worker) {
      if (confirm(`${worker.name} çalışanını pasifleştirmek istediğinizden emin misiniz?`)) {
        try {
          const response = await fetch(`http://localhost:5001/api/ppe/workers/${worker.id}/deactivate`, {
            method: 'PUT'
          })
          
          if (response.ok) {
            this.showMessage(`${worker.name} pasifleştirildi! 🚫`, 'success')
            this.loadWorkers()
            this.loadStatistics()
          }
        } catch (error) {
          console.error('Çalışan pasifleştirilemedi:', error)
          this.showMessage('İşlem başarısız! ❌', 'error')
        }
      }
    },
    
    showWorkerHistory(worker) {
      this.showWorkerDetails(worker)
      this.activeDetailTab = 'history'
    },
    
    viewLiveLocation(worker) {
      this.$router.push(`/monitoring?worker=${worker.id}`)
    },
    
    sendMessage(worker) {
      this.showMessage(`${worker.name} mesaj gönderildi! 💬`, 'success')
    },
    
    scheduleTraining(worker) {
      this.showMessage(`${worker.name} eğitim planlandı! 📚`, 'success')
    },
    
    // Yardımcı fonksiyonlar
    getInitials(name) {
      return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'
    },
    
    getStatusText(status) {
      const statusMap = {
        'active': 'Aktif',
        'inactive': 'Pasif',
        'training': 'Eğitimde',
        'suspended': 'Askıda'
      }
      return statusMap[status] || 'Bilinmeyen'
    },
    
    getComplianceClass(rate) {
      if (rate >= 90) return 'excellent'
      if (rate >= 75) return 'good'
      if (rate >= 60) return 'average'
      return 'poor'
    },
    
    getScoreClass(score) {
      if (score >= 80) return 'excellent'
      if (score >= 60) return 'good'
      if (score >= 40) return 'average'
      return 'poor'
    },
    
    getTrainingStatusText(status) {
      const statusMap = {
        'completed': 'Tamamlandı',
        'in-progress': 'Devam Ediyor',
        'pending': 'Beklemede',
        'overdue': 'Gecikmiş'
      }
      return statusMap[status] || 'Belirlenmemiş'
    },
    
    getLastSeenClass(lastSeen) {
      const now = new Date()
      const lastSeenDate = new Date(lastSeen)
      const diffHours = (now - lastSeenDate) / (1000 * 60 * 60)
      
      if (diffHours <= 1) return 'recent'
      if (diffHours <= 24) return 'today'
      if (diffHours <= 168) return 'this-week'
      return 'old'
    },
    
    getPPEIcon(type) {
      const iconMap = {
        'Baret': '⛑️',
        'Gözlük': '🥽',
        'Eldiven': '🧤',
        'Yelek': '🦺',
        'Ayakkabı': '👷',
        'Maske': '😷',
        'Kulaklık': '🎧'
      }
      return iconMap[type] || '🔧'
    },
    
    getHistoryIcon(type) {
      const iconMap = {
        'violation': '⚠️',
        'training': '📚',
        'ppe': '🦺',
        'status': '📊',
        'assignment': '👔',
        'note': '📝'
      }
      return iconMap[type] || '📋'
    },
    
    getManagerName(managerId) {
      const manager = this.managers.find(m => m.id === managerId)
      return manager?.name || 'Atanmamış'
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Belirtilmemiş'
      return new Date(dateString).toLocaleDateString('tr-TR')
    },
    
    formatDateTime(dateString) {
      if (!dateString) return 'Belirtilmemiş'
      return new Date(dateString).toLocaleString('tr-TR')
    },
    
    formatLastSeen(lastSeen) {
      if (!lastSeen) return 'Hiç görülmedi'
      
      const now = new Date()
      const lastSeenDate = new Date(lastSeen)
      const diffMinutes = (now - lastSeenDate) / (1000 * 60)
      
      if (diffMinutes < 1) return 'Şimdi'
      if (diffMinutes < 60) return `${Math.floor(diffMinutes)} dk önce`
      
      const diffHours = diffMinutes / 60
      if (diffHours < 24) return `${Math.floor(diffHours)} saat önce`
      
      const diffDays = diffHours / 24
      if (diffDays < 7) return `${Math.floor(diffDays)} gün önce`
      
      return this.formatDate(lastSeen)
    },
    
    calculateWorkDuration(startDate) {
      if (!startDate) return 'Belirtilmemiş'
      
      const start = new Date(startDate)
      const now = new Date()
      const diffTime = now - start
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 30) return `${diffDays} gün`
      
      const diffMonths = Math.floor(diffDays / 30)
      if (diffMonths < 12) return `${diffMonths} ay`
      
      const diffYears = Math.floor(diffMonths / 12)
      const remainingMonths = diffMonths % 12
      
      if (remainingMonths === 0) return `${diffYears} yıl`
      return `${diffYears} yıl ${remainingMonths} ay`
    },
    
    showMessage(text, type = 'success') {
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
.workers-container {
  padding: 2rem;
  background: #f8f9fa;
  min-height: 100vh;
}

/* Sayfa Başlığı */
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
  align-items: center;
  gap: 1rem;
}

.search-box {
  position: relative;
}

.search-input {
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  width: 300px;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
}

/* İstatistik Kartları */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
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
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-icon {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #6c757d;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-change {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.stat-change.positive {
  background: #d4edda;
  color: #155724;
}

.stat-change.negative {
  background: #f8d7da;
  color: #721c24;
}

/* Filtreler */
.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filters-left {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #495057;
}

.filter-select,
.sort-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  min-width: 120px;
}

.filters-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.view-controls {
  display: flex;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.view-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.view-btn:hover {
  background: #f8f9fa;
}

.view-btn.active {
  background: #007bff;
  color: white;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-order-btn {
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
}

/* Çalışan Kartları */
.workers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.worker-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  border: 2px solid transparent;
}

.worker-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.worker-card.has-violations {
  border-color: #dc3545;
}

.worker-card.excellent-compliance {
  border-left: 4px solid #28a745;
}

.worker-card.poor-compliance {
  border-left: 4px solid #dc3545;
}

.worker-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #f8f9fa;
}

.worker-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.worker-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 1.5rem;
  font-weight: bold;
  color: #6c757d;
}

.worker-basic-info {
  flex: 1;
}

.worker-basic-info h3 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.worker-id {
  color: #6c757d;
  font-size: 0.8rem;
  margin: 0 0 0.5rem 0;
  font-family: monospace;
}

.worker-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.worker-status.active .status-dot {
  background: #28a745;
}

.worker-status.inactive .status-dot {
  background: #6c757d;
}

.worker-status.training .status-dot {
  background: #ffc107;
}

.worker-status.suspended .status-dot {
  background: #dc3545;
}

.worker-actions {
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #e9ecef;
}

.action-menu {
  position: relative;
}

.action-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  min-width: 150px;
}

.action-dropdown button {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 0.9rem;
}

.action-dropdown button:hover {
  background: #f8f9fa;
}

.action-dropdown button.danger:hover {
  background: #f8d7da;
  color: #721c24;
}

.worker-details {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f8f9fa;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.detail-label {
  color: #6c757d;
  font-weight: 500;
}

.detail-value {
  color: #2c3e50;
  font-weight: 600;
}

.worker-ppe {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f8f9fa;
}

.worker-ppe h4 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 0.9rem;
}

.ppe-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ppe-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ppe-badge.assigned {
  background: #d4edda;
  color: #155724;
}

.ppe-badge.missing {
  background: #f8d7da;
  color: #721c24;
}

.worker-metrics {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f8f9fa;
}

.metric-item {
  margin-bottom: 1rem;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.metric-label {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 600;
}

.metric-value {
  font-weight: bold;
  font-size: 0.9rem;
}

.metric-value.excellent {
  color: #28a745;
}

.metric-value.good {
  color: #17a2b8;
}

.metric-value.average {
  color: #ffc107;
}

.metric-value.poor {
  color: #dc3545;
}

.progress-bar {
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-fill.excellent {
  background: #28a745;
}

.progress-fill.good {
  background: #17a2b8;
}

.progress-fill.average {
  background: #ffc107;
}

.progress-fill.poor {
  background: #dc3545;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.metric-small {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-small .metric-label {
  font-size: 0.7rem;
}

.metric-small .metric-value {
  font-size: 0.8rem;
}

.metric-value.has-violations {
  color: #dc3545;
}

.worker-footer {
  padding: 1rem 1.5rem;
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
}

.quick-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s;
}

.quick-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #007bff;
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tablo Görünümü */
.workers-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

.workers-table {
  width: 100%;
  border-collapse: collapse;
}

.workers-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #e9ecef;
  position: sticky;
  top: 0;
  z-index: 10;
}

.workers-table th.sortable {
  cursor: pointer;
  transition: background 0.3s;
}

.workers-table th.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}

.workers-table td {
  padding: 1rem;
  border-bottom: 1px solid #f8f9fa;
  vertical-align: middle;
}

.worker-row {
  cursor: pointer;
  transition: background 0.3s;
}

.worker-row:hover {
  background: #f8f9fa;
}

.worker-row.has-violations {
  background: #fff5f5;
}

.worker-row.inactive {
  opacity: 0.7;
}

.worker-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.worker-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.worker-avatar-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-small {
  font-size: 1rem;
  font-weight: bold;
  color: #6c757d;
}

.worker-name-info strong {
  display: block;
  color: #2c3e50;
}

.worker-name-info small {
  color: #6c757d;
  font-size: 0.8rem;
}

.worker-id-code {
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.training {
  background: #fff3cd;
  color: #856404;
}

.status-badge.suspended {
  background: #f8d7da;
  color: #721c24;
}

.compliance-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.compliance-value {
  font-weight: bold;
  font-size: 0.9rem;
}

.mini-progress {
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  width: 60px;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 2px;
}

.violations-count {
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  background: #d4edda;
  color: #155724;
  font-size: 0.8rem;
}

.violations-count.has-violations {
  background: #f8d7da;
  color: #721c24;
}

.ppe-icons {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.ppe-icon {
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.ppe-icon.assigned {
  background: #d4edda;
}

.ppe-icon.missing {
  background: #f8d7da;
}

.ppe-more {
  font-size: 0.7rem;
  color: #6c757d;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.last-seen {
  font-size: 0.8rem;
}

.last-seen.recent {
  color: #28a745;
  font-weight: 600;
}

.last-seen.today {
  color: #17a2b8;
}

.last-seen.this-week {
  color: #ffc107;
}

.last-seen.old {
  color: #6c757d;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.table-action-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.table-action-btn:hover {
  background: #e9ecef;
}

/* Sayfalama */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.pagination-info {
  color: #6c757d;
  font-size: 0.9rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.items-per-page {
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e9ecef;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0.5rem 1rem;
  color: #495057;
  font-weight: 600;
}

/* Modal Stilleri */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.worker-modal,
.detail-modal,
.ppe-modal,
.import-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  max-height: 90vh;
  overflow-y: auto;
}

.worker-modal {
  max-width: 800px;
  width: 90%;
}

.detail-modal {
  max-width: 900px;
  width: 90%;
}

.ppe-modal {
  max-width: 700px;
  width: 90%;
}

.import-modal {
  max-width: 800px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.detail-header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.detail-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-large {
  font-size: 1.5rem;
  font-weight: bold;
  color: #6c757d;
}

.detail-basic-info h3 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.detail-worker-id {
  color: #6c757d;
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  font-family: monospace;
}

.detail-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

/* Form Stilleri */
.worker-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section.full-width {
  grid-column: 1 / -1;
}

.form-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
}

.photo-upload {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #f8f9fa;
  border: 2px dashed #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  font-size: 2rem;
  color: #6c757d;
}

.photo-input {
  flex: 1;
}

.remove-photo {
  padding: 0.5rem;
  border: none;
  background: #dc3545;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.ppe-assignment {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.ppe-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.ppe-checkbox {
  display: flex;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.ppe-checkbox:hover {
  background: #f8f9fa;
}

.ppe-checkbox input {
  margin-right: 0.75rem;
}

.ppe-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ppe-icon {
  font-size: 1.5rem;
}

.ppe-name {
  font-weight: 600;
  color: #2c3e50;
}

.ppe-desc {
  font-size: 0.8rem;
  color: #6c757d;
}

/* Detay Modal Tabları */
.detail-tabs {
  display: flex;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 1.5rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 600;
  color: #6c757d;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: #495057;
  background: #f8f9fa;
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.info-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.info-section.full-width {
  grid-column: 1 / -1;
}

.info-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  color: #6c757d;
  font-weight: 500;
}

.info-value {
  color: #2c3e50;
  font-weight: 600;
}


.notes-content {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  min-height: 80px;
  color: #495057;
  font-style: italic;
}

/* PPE Detay Stilleri */
.ppe-detail-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h4 {
  margin: 0;
  color: #2c3e50;
}

.ppe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.ppe-detail-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.ppe-detail-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.ppe-detail-card.assigned {
  border-left: 4px solid #28a745;
}

.ppe-detail-card.missing {
  border-left: 4px solid #dc3545;
}

.ppe-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.ppe-icon-large {
  font-size: 2rem;
  background: white;
  padding: 0.75rem;
  border-radius: 50%;
  border: 2px solid #e9ecef;
}

.ppe-card-info h5 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.ppe-status {
  color: #6c757d;
  font-size: 0.9rem;
  margin: 0;
}

.ppe-card-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ppe-detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.ppe-card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: 1px solid #dc3545;
}

.btn-danger:hover {
  background: #c82333;
  border-color: #bd2130;
}

.empty-ppe {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}

.empty-ppe .empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* İstatistik Stilleri */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card-small {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e9ecef;
}

.stat-card-small .stat-icon {
  font-size: 2rem;
}

.stat-card-small .stat-content {
  flex: 1;
}

.stat-card-small .stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.stat-card-small .stat-label {
  color: #6c757d;
  font-size: 0.8rem;
}

.chart-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.chart-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.chart-placeholder {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recent-violations {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.recent-violations h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.violations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.violation-item {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.violation-date {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 600;
  min-width: 120px;
}

.violation-details {
  flex: 1;
}

.violation-details strong {
  color: #dc3545;
  display: block;
  margin-bottom: 0.25rem;
}

.violation-details p {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 0.9rem;
}

.violation-location {
  font-size: 0.8rem;
  color: #6c757d;
}

.violation-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
}

.violation-status.resolved {
  background: #d4edda;
  color: #155724;
}

.violation-status.open {
  background: #f8d7da;
  color: #721c24;
}

.no-violations {
  text-align: center;
  padding: 2rem;
  color: #28a745;
  font-weight: 600;
}

/* Geçmiş Stilleri */
.history-filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.date-input {
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9rem;
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  border-left: 4px solid #e9ecef;
}

.history-item.violation {
  border-left-color: #dc3545;
}

.history-item.training {
  border-left-color: #17a2b8;
}

.history-item.ppe {
  border-left-color: #28a745;
}

.history-item.status {
  border-left-color: #ffc107;
}

.history-date {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 600;
  min-width: 120px;
}

.history-icon {
  font-size: 1.5rem;
  min-width: 40px;
  text-align: center;
}

.history-content {
  flex: 1;
}

.history-content h5 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.history-content p {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 0.9rem;
}

.history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.detail-tag {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  color: #495057;
}

.empty-history {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}

.empty-history .empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* PPE Atama Modal Stilleri */
.ppe-assignment-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.current-ppe h4,
.available-ppe h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

.current-ppe-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.current-ppe-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.current-ppe-item .ppe-icon {
  font-size: 1.5rem;
}

.current-ppe-item .ppe-name {
  flex: 1;
  font-weight: 600;
  color: #2c3e50;
}

.current-ppe-item .ppe-status {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
}

.remove-ppe-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.ppe-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.ppe-option {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.ppe-option:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0,123,255,0.1);
}

.ppe-option.selected {
  border-color: #007bff;
  background: #f0f8ff;
}

.ppe-option-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.ppe-option-content .ppe-icon-large {
  font-size: 2rem;
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 50%;
  border: 2px solid #e9ecef;
}

.ppe-option-info h5 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.ppe-option-info p {
  margin: 0 0 0.5rem 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.ppe-category {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  color: #495057;
}

.ppe-option-checkbox {
  text-align: right;
}

.ppe-assignment-details {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.ppe-assignment-details h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.assignment-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* İçe Aktarma Modal Stilleri */
.import-steps {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 2rem;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -1rem;
  width: 2rem;
  height: 2px;
  background: #e9ecef;
  top: 50%;
  transform: translateY(-50%);
}

.step.active:not(:last-child)::after {
  background: #007bff;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e9ecef;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #007bff;
  color: white;
}

.step-content h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
  font-size: 0.9rem;
}

.step-content p {
  margin: 0;
  color: #6c757d;
  font-size: 0.8rem;
}

.import-step-1 {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.file-upload-area {
  border: 2px dashed #007bff;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  background: #f0f8ff;
  transition: all 0.3s;
}

.file-upload-area:hover {
  background: #e6f3ff;
}

.upload-icon {
  font-size: 4rem;
  color: #007bff;
  margin-bottom: 1rem;
}

.file-upload-area h4 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.file-upload-area p {
  color: #6c757d;
  margin-bottom: 1.5rem;
}

.file-input {
  display: none;
}

.template-download {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.template-download h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.template-download p {
  margin: 0 0 1rem 0;
  color: #6c757d;
}

.import-step-2 {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.import-preview h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.preview-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.preview-stat {
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.preview-stat.valid {
  background: #d4edda;
  color: #155724;
}

.preview-stat.invalid {
  background: #f8d7da;
  color: #721c24;
}

.preview-table {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.preview-table table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th {
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #e9ecef;
  position: sticky;
  top: 0;
}

.preview-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f8f9fa;
  font-size: 0.9rem;
}

.preview-table tr.invalid {
  background: #fff5f5;
}

.status-error {
  color: #dc3545;
}

.status-valid {
  color: #28a745;
}

.error-text {
  color: #dc3545;
  font-size: 0.8rem;
}

.import-step-3 {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.import-progress h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  text-align: center;
}

.progress-bar {
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 10px;
  transition: width 0.3s;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.import-progress p {
  text-align: center;
  color: #6c757d;
  font-weight: 600;
}

.import-results {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.result-summary {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
}

.result-item.success {
  background: #d4edda;
  color: #155724;
}

.result-item.error {
  background: #f8d7da;
  color: #721c24;
}

.result-icon {
  font-size: 1.2rem;
}

.import-errors h5 {
  margin: 0 0 1rem 0;
  color: #721c24;
}

.error-list {
  max-height: 200px;
  overflow-y: auto;
}

.error-item {
  padding: 0.5rem;
  background: white;
  border: 1px solid #f8d7da;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #721c24;
}

/* Loading ve Empty States */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: #6c757d;
}

.loading-spinner {
  font-size: 1.2rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: #6c757d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.empty-state p {
  margin: 0 0 2rem 0;
  font-size: 1.1rem;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Buton Stilleri */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: 1px solid #007bff;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: 1px solid #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
  border-color: #545b62;
}

.btn-outline {
  background: white;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

/* Mesaj Stilleri */
.message {
  position: fixed;
  top: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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

.message.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

/* Responsive Tasarım */
@media (max-width: 1200px) {
  .workers-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .workers-container {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  .search-input {
    width: 100%;
    max-width: none;
  }
  
  .filters-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filters-left {
    width: 100%;
  }
  
  .filters-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .workers-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-section {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .pagination-section {
    flex-direction: column;
    gap: 1rem;
  }
  
  .worker-modal,
  .detail-modal,
  .ppe-modal,
  .import-modal {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .workers-table-container {
    overflow-x: auto;
  }
  
  .workers-table {
    min-width: 800px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .stats-section {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .worker-card {
    margin: 0;
  }
  
  .worker-header {
    padding: 1rem;
  }
  
  .worker-avatar {
    width: 50px;
    height: 50px;
  }
  
  .metric-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .import-steps {
    flex-direction: column;
    gap: 1rem;
  }
  
  .step:not(:last-child)::after {
    display: none;
  }
  
  .result-summary {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
