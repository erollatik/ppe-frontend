<template>
  <div id="app">
    <!-- Navigation (ana sayfalarda) -->
    <nav v-if="showNavigation" class="main-nav">
      <div class="nav-brand">
        <h2>🦺 PPE Takip Sistemi</h2>
      </div>
      
      <div class="nav-links">
        <router-link to="/main" class="nav-link">
          <i class="icon">🏠</i> Ana Sayfa
        </router-link>
        <router-link to="/violations" class="nav-link">
          <i class="icon">⚠️</i> İhlaller
        </router-link>
        <router-link to="/workers" class="nav-link">
          <i class="icon">👥</i> Çalışanlar
        </router-link>
        <router-link to="/settings" class="nav-link">
          <i class="icon">⚙️</i> Ayarlar
        </router-link>
        <button @click="logout" class="nav-link logout-btn">
          <i class="icon">🚪</i> Çıkış
        </button>
      </div>
    </nav>

    <!-- Ana İçerik -->
    <main :class="{ 'with-nav': showNavigation }">
      <router-view />
    </main>
  </div>
</template>

<script>
import { useAuthStore } from '@/stores/auth.js'
import { authAPI } from '@/api/auth.js'  // ← Bu satırı düzelt!

export default {
  name: 'App',
  setup() {
    const authStore = useAuthStore()
    
    return {
      authStore
    }
  },
  computed: {
    showNavigation() {
      // Login sayfasında navigation gösterme
      return this.$route.path !== '/login'
    }
  },
  methods: {
    // Logout fonksiyonu
    async logout() {
      try {
        // Onay penceresi
        if (!confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
          return
        }
        
        console.log('Logout başlatılıyor...')
        
        // Backend'e logout isteği (opsiyonel)
        try {
          await authAPI.logout()
          console.log('Backend logout başarılı')
        } catch (error) {
          console.warn('Backend logout hatası:', error)
          // Backend hatası olsa bile devam et
        }
        
        // Store'dan logout
        this.authStore.logout()
        console.log('Store logout başarılı')
        
        // Başarı mesajı
        alert('Başarıyla çıkış yapıldı!')
        
        // Login sayfasına yönlendir
        this.$router.push('/login')
        
      } catch (error) {
        console.error('Logout error:', error)
        
        // Hata olsa bile çıkış yap
        this.authStore.logout()
        alert('Çıkış yapılırken bir hata oluştu, yine de çıkış yapılıyor...')
        this.$router.push('/login')
      }
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f5f5;
}

.main-nav {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-brand h2 {
  color: #ecf0f1;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-link {
  color: #ecf0f1;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: #34495e;
}

.logout-btn {
  background: #e74c3c;
  border: none;
  cursor: pointer;
}

.logout-btn:hover {
  background: #c0392b;
}

main {
  min-height: 100vh;
}

main.with-nav {
  min-height: calc(100vh - 70px);
}

.icon {
  font-size: 1.1em;
}
</style>
