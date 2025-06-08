import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import MainView from '@/views/MainView.vue'
import DashboardView from '@/views/DashboardView.vue'
import MonitoringView from '@/views/MonitoringView.vue'
import WorkersView from '@/views/WorkersView.vue'
import ViolationView from '@/views/ViolationView.vue'
import SettingsView from '@/views/SettingsView.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/main',
    name: 'Main',
    component: MainView,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/main/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView
      },
      {
        path: 'monitoring',
        name: 'Monitoring',
        component: MonitoringView
      },
      {
        path: 'workers',
        name: 'Workers',
        component: WorkersView
      },
      {
        path: 'violations',
        name: 'Violations',
        component: ViolationView
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsView
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isLoggedIn) {
      next('/login')
    } else {
      next()
    }
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    // Eğer zaten giriş yapmışsa dashboard'a yönlendir
    next('/main/dashboard')
  } else {
    next()
  }
})

export default router
