import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { load } from '@tauri-apps/plugin-store'
import { platform, arch } from '@tauri-apps/plugin-os'
import api, { authApi } from '@/services/api'
import type { Tenant, User, UserPermissions } from '@/types'
import { useCustomerStore } from './customer'
import { useProductStore } from './products'
import { useCartStore } from './cart'

export const useAuthStore = defineStore('auth', () => {
  // State
  const tenant = ref<Tenant | null>(null)
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const permissions = ref<UserPermissions | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Actions
  async function verifyTenant(domain: string): Promise<boolean> {
    try {
      const response = await authApi.verifyTenant(domain)
      if (response.success && response.tenant) {
        // If switching to a different tenant, reset all stores
        if (tenant.value && tenant.value.id !== response.tenant.id) {
          const customerStore = useCustomerStore()
          const productStore = useProductStore()
          const cartStore = useCartStore()
          customerStore.reset()
          productStore.reset()
          cartStore.clear()
        }

        tenant.value = response.tenant
        // Set base URL for all future API calls
        api.defaults.baseURL = response.tenant.api_base_url
        return true
      }
      throw new Error(response.message || 'Tenant verification failed')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Tenant verification failed')
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const deviceName = await getDeviceName()
      const response = await authApi.login(email, password, deviceName)

      console.log('[Auth] Login response:', response)

      if (response.success && response.token && response.user) {
        token.value = response.token
        user.value = response.user
        permissions.value = response.permissions || null

        console.log('[Auth] Token set:', !!token.value, 'User set:', !!user.value)

        // Set auth header for all future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`

        // Store credentials securely (non-blocking - don't wait for it)
        saveCredentials().catch((err) => {
          console.error('Failed to save credentials:', err)
        })

        return true
      }
      console.error('[Auth] Login response missing required fields:', {
        success: response.success,
        hasToken: !!response.token,
        hasUser: !!response.user
      })
      throw new Error(response.message || 'Login failed')
    } catch (error: any) {
      console.error('[Auth] Login error:', error)
      throw new Error(error.response?.data?.message || error.message || 'Login failed')
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // Ignore errors during logout
    }

    // Clear state
    token.value = null
    user.value = null
    permissions.value = null
    tenant.value = null

    // Clear auth header
    delete api.defaults.headers.common['Authorization']

    // Clear API base URL
    api.defaults.baseURL = undefined

    // Reset all other stores
    const customerStore = useCustomerStore()
    const productStore = useProductStore()
    const cartStore = useCartStore()
    customerStore.reset()
    productStore.reset()
    cartStore.clear()

    // Clear localStorage items
    localStorage.removeItem('pos_selected_customer')
    localStorage.removeItem('pos_remember_email')

    // Clear stored credentials
    await clearCredentials()
  }

  async function restoreSession(): Promise<boolean> {
    try {
      const store = await load('.credentials.dat')

      const storedToken = await store.get<string>('token')
      const storedTenant = await store.get<Tenant>('tenant')
      const storedApiBaseUrl = await store.get<string>('api_base_url')

      if (storedToken && storedTenant && storedApiBaseUrl) {
        token.value = storedToken
        tenant.value = storedTenant
        api.defaults.baseURL = storedApiBaseUrl
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`

        // Verify token is still valid
        try {
          const userData = await authApi.getUser()
          user.value = userData
          return true
        } catch {
          // Token expired, clear everything
          await logout()
          return false
        }
      }
      return false
    } catch {
      return false
    }
  }

  async function saveCredentials(): Promise<void> {
    try {
      const store = await load('.credentials.dat')
      await store.set('token', token.value)
      await store.set('tenant', tenant.value)
      await store.set('api_base_url', tenant.value?.api_base_url)
      await store.save()
    } catch (error) {
      console.error('Failed to save credentials:', error)
    }
  }

  async function clearCredentials(): Promise<void> {
    try {
      const store = await load('.credentials.dat')
      await store.clear()
      await store.save()
    } catch (error) {
      console.error('Failed to clear credentials:', error)
    }
  }

  async function getDeviceName(): Promise<string> {
    try {
      const p = await platform()
      const a = await arch()
      return `${p}-${a}`
    } catch {
      return 'unknown-device'
    }
  }

  // Listen for unauthorized events
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:unauthorized', () => {
      logout()
    })
  }

  return {
    // State
    tenant,
    user,
    token,
    permissions,
    // Getters
    isAuthenticated,
    isAdmin,
    // Actions
    verifyTenant,
    login,
    logout,
    restoreSession,
  }
})
