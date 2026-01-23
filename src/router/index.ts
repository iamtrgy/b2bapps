import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

let sessionRestored = false

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/tenant',
    },
    {
      path: '/tenant',
      name: 'tenant',
      component: () => import('@/views/TenantView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false, requiresTenant: true },
    },
    {
      path: '/pos',
      name: 'pos',
      component: () => import('@/views/PosView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('@/views/OrderDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('@/views/CustomersView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Try to restore session on first navigation
  if (!sessionRestored) {
    sessionRestored = true
    await authStore.restoreSession()
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if not authenticated
    if (authStore.tenant) {
      next({ name: 'login' })
    } else {
      next({ name: 'tenant' })
    }
    return
  }

  // Check if route requires tenant but no tenant selected
  if (to.meta.requiresTenant && !authStore.tenant) {
    next({ name: 'tenant' })
    return
  }

  // If authenticated and trying to access login/tenant, redirect to POS
  if (authStore.isAuthenticated && (to.name === 'login' || to.name === 'tenant')) {
    next({ name: 'pos' })
    return
  }

  next()
})

export default router
