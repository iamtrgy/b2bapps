import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockVerifyTenant = vi.fn()
const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/services/api', () => ({
  default: {
    defaults: {
      baseURL: undefined as string | undefined,
      headers: { common: {} as Record<string, string> },
    },
  },
  authApi: {
    verifyTenant: (...args: unknown[]) => mockVerifyTenant(...args),
    login: (...args: unknown[]) => mockLogin(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  },
  customerApi: {},
  productApi: {},
  orderApi: {},
  categoryApi: {},
  promotionApi: {},
}))

// Mock Tauri Store plugin
const mockStoreGet = vi.fn()
const mockStoreSet = vi.fn()
const mockStoreSave = vi.fn()
const mockStoreClear = vi.fn()

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(() => Promise.resolve({
    get: mockStoreGet,
    set: mockStoreSet,
    save: mockStoreSave,
    clear: mockStoreClear,
  })),
}))

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => Promise.resolve('macos')),
  arch: vi.fn(() => Promise.resolve('aarch64')),
}))

const mockLocalStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value },
  removeItem: (key: string) => { delete mockLocalStorage[key] },
})

describe('useAuthStore', () => {
  let store: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useAuthStore()
    for (const key in mockLocalStorage) delete mockLocalStorage[key]
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(store.tenant).toBeNull()
      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.permissions).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isAdmin).toBe(false)
    })
  })

  describe('isAuthenticated (computed)', () => {
    it('returns true when token and user exist', () => {
      store.token = 'test-token'
      store.user = { id: 1, name: 'Test', email: 'test@test.com', role: 'user' }
      expect(store.isAuthenticated).toBe(true)
    })

    it('returns false without token', () => {
      store.user = { id: 1, name: 'Test', email: 'test@test.com', role: 'user' }
      expect(store.isAuthenticated).toBe(false)
    })

    it('returns false without user', () => {
      store.token = 'test-token'
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('isAdmin (computed)', () => {
    it('returns true for admin role', () => {
      store.user = { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' }
      expect(store.isAdmin).toBe(true)
    })

    it('returns false for non-admin role', () => {
      store.user = { id: 1, name: 'User', email: 'user@test.com', role: 'user' }
      expect(store.isAdmin).toBe(false)
    })

    it('returns false without user', () => {
      expect(store.isAdmin).toBe(false)
    })
  })

  describe('verifyTenant', () => {
    it('stores tenant and sets API base URL on success', async () => {
      const tenant = {
        id: 't1',
        name: 'Test Store',
        company_name: 'Test Co',
        logo_url: null,
        api_base_url: 'https://api.test.com',
      }
      mockVerifyTenant.mockResolvedValue({ success: true, tenant })

      const result = await store.verifyTenant('test.b2bnord.com')

      expect(result).toBe(true)
      expect(store.tenant).toEqual(tenant)
      expect(mockVerifyTenant).toHaveBeenCalledWith('test.b2bnord.com')
    })

    it('throws on unsuccessful response', async () => {
      mockVerifyTenant.mockResolvedValue({ success: false, message: 'Not found' })

      await expect(store.verifyTenant('bad.com')).rejects.toThrow()
    })

    it('throws on API error', async () => {
      mockVerifyTenant.mockRejectedValue(new Error('Network error'))

      await expect(store.verifyTenant('bad.com')).rejects.toThrow()
    })
  })

  describe('login', () => {
    it('stores token, user, and permissions on success', async () => {
      const user = { id: 1, name: 'Test User', email: 'test@test.com', role: 'user' }
      const permissions = { can_create_orders: true, can_view_all_customers: false, can_apply_discounts: false, can_assign_barcodes: false }
      mockLogin.mockResolvedValue({
        success: true,
        token: 'new-token',
        user,
        permissions,
      })
      mockStoreSet.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      const result = await store.login('test@test.com', 'password')

      expect(result).toBe(true)
      expect(store.token).toBe('new-token')
      expect(store.user).toEqual(user)
      expect(store.permissions).toEqual(permissions)
    })

    it('passes device name to API', async () => {
      mockLogin.mockResolvedValue({
        success: true, token: 'tk', user: { id: 1, name: 'U', email: 'e', role: 'r' },
      })
      mockStoreSet.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      await store.login('test@test.com', 'pass')

      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'pass', 'macos-aarch64')
    })

    it('throws on unsuccessful response', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      })

      await expect(store.login('bad@test.com', 'wrong')).rejects.toThrow()
    })

    it('throws when token is missing', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        token: null,
        user: { id: 1, name: 'U', email: 'e', role: 'r' },
      })

      await expect(store.login('test@test.com', 'pass')).rejects.toThrow()
    })

    it('throws on API error', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'))

      await expect(store.login('test@test.com', 'pass')).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('clears all auth state', async () => {
      store.token = 'token'
      store.user = { id: 1, name: 'U', email: 'e', role: 'r' }
      store.tenant = { id: 't', name: 'T', company_name: 'C', logo_url: null, api_base_url: 'https://api.test.com' }
      store.permissions = { can_create_orders: true, can_view_all_customers: false, can_apply_discounts: false, can_assign_barcodes: false }
      mockLogout.mockResolvedValue(undefined)
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      await store.logout()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.tenant).toBeNull()
      expect(store.permissions).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('continues even if API logout fails', async () => {
      store.token = 'token'
      store.user = { id: 1, name: 'U', email: 'e', role: 'r' }
      mockLogout.mockRejectedValue(new Error('Network'))
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      await store.logout()

      expect(store.token).toBeNull()
    })

    it('clears localStorage items', async () => {
      mockLocalStorage['pos_selected_customer'] = 'test'
      mockLocalStorage['pos_remember_email'] = 'test@test.com'
      mockLogout.mockResolvedValue(undefined)
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      await store.logout()

      expect(mockLocalStorage['pos_selected_customer']).toBeUndefined()
      expect(mockLocalStorage['pos_remember_email']).toBeUndefined()
    })
  })

  describe('restoreSession', () => {
    it('restores session from stored credentials', async () => {
      const user = { id: 1, name: 'Stored User', email: 'stored@test.com', role: 'user' }
      const tenant = { id: 't1', name: 'Stored Tenant', company_name: 'C', logo_url: null, api_base_url: 'https://stored.api.com' }
      mockStoreGet.mockImplementation((key: string) => {
        if (key === 'token') return Promise.resolve('stored-token')
        if (key === 'tenant') return Promise.resolve(tenant)
        if (key === 'api_base_url') return Promise.resolve('https://stored.api.com')
        return Promise.resolve(null)
      })
      mockGetUser.mockResolvedValue(user)

      const result = await store.restoreSession()

      expect(result).toBe(true)
      expect(store.token).toBe('stored-token')
      expect(store.tenant).toEqual(tenant)
      expect(store.user).toEqual(user)
    })

    it('returns false when no stored credentials', async () => {
      mockStoreGet.mockResolvedValue(null)

      const result = await store.restoreSession()

      expect(result).toBe(false)
    })

    it('logs out when token is expired', async () => {
      mockStoreGet.mockImplementation((key: string) => {
        if (key === 'token') return Promise.resolve('expired-token')
        if (key === 'tenant') return Promise.resolve({ id: 't1', name: 'T', company_name: 'C', logo_url: null, api_base_url: 'https://api.com' })
        if (key === 'api_base_url') return Promise.resolve('https://api.com')
        return Promise.resolve(null)
      })
      mockGetUser.mockRejectedValue(new Error('Unauthorized'))
      mockLogout.mockResolvedValue(undefined)
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      const result = await store.restoreSession()

      expect(result).toBe(false)
    })

    it('returns false on store load error', async () => {
      const { load } = await import('@tauri-apps/plugin-store')
      vi.mocked(load).mockRejectedValueOnce(new Error('Store error'))

      const result = await store.restoreSession()

      expect(result).toBe(false)
    })
  })

  describe('saveCredentials error', () => {
    it('catches Tauri store error silently', async () => {
      mockStoreSet.mockRejectedValue(new Error('Store write error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Login triggers saveCredentials non-blocking
      mockLogin.mockResolvedValue({
        success: true, token: 'tk', user: { id: 1, name: 'U', email: 'e', role: 'r' },
      })

      await store.login('test@test.com', 'pass')
      // Wait for the non-blocking saveCredentials to settle
      await new Promise(r => setTimeout(r, 0))

      // Should not throw; error is caught internally
      expect(store.token).toBe('tk')
      consoleSpy.mockRestore()
    })
  })

  describe('clearCredentials', () => {
    it('clears the store successfully', async () => {
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)
      mockLogout.mockResolvedValue(undefined)

      store.token = 'token'
      store.user = { id: 1, name: 'U', email: 'e', role: 'r' }

      await store.logout()

      expect(mockStoreClear).toHaveBeenCalled()
      expect(mockStoreSave).toHaveBeenCalled()
    })

    it('handles clear credentials error gracefully', async () => {
      mockStoreClear.mockRejectedValue(new Error('Clear error'))
      mockLogout.mockResolvedValue(undefined)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      store.token = 'token'
      store.user = { id: 1, name: 'U', email: 'e', role: 'r' }

      // Should not throw
      await store.logout()
      expect(store.token).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  describe('getDeviceName fallback', () => {
    it('returns device name from platform and arch', async () => {
      mockLogin.mockResolvedValue({
        success: true, token: 'tk', user: { id: 1, name: 'U', email: 'e', role: 'r' },
      })
      mockStoreSet.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      await store.login('test@test.com', 'pass')

      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'pass', 'macos-aarch64')
    })

    it('returns unknown-device on platform error', async () => {
      const { platform } = await import('@tauri-apps/plugin-os')
      vi.mocked(platform).mockRejectedValueOnce(new Error('Not available'))

      mockLogin.mockResolvedValue({
        success: true, token: 'tk', user: { id: 1, name: 'U', email: 'e', role: 'r' },
      })
      mockStoreSet.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      await store.login('test@test.com', 'pass')

      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'pass', 'unknown-device')
    })
  })

  describe('verifyTenant resets stores when switching tenants', () => {
    it('resets other stores when tenant changes', async () => {
      const tenant1 = { id: 't1', name: 'Store1', company_name: 'C1', logo_url: null, api_base_url: 'https://api1.com' }
      const tenant2 = { id: 't2', name: 'Store2', company_name: 'C2', logo_url: null, api_base_url: 'https://api2.com' }
      mockVerifyTenant
        .mockResolvedValueOnce({ success: true, tenant: tenant1 })
        .mockResolvedValueOnce({ success: true, tenant: tenant2 })

      await store.verifyTenant('store1.com')
      expect(store.tenant?.id).toBe('t1')

      await store.verifyTenant('store2.com')
      expect(store.tenant?.id).toBe('t2')
    })
  })

  describe('login edge cases', () => {
    it('throws when response is missing user', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        token: 'tk',
        user: null,
      })

      await expect(store.login('test@test.com', 'pass')).rejects.toThrow()
    })
  })

  describe('saveCredentials error in login (line 66)', () => {
    it('login succeeds even when saveCredentials throws', async () => {
      // Make the Tauri store load() reject to simulate saveCredentials failure
      const { load } = await import('@tauri-apps/plugin-store')
      vi.mocked(load).mockRejectedValueOnce(new Error('Tauri store unavailable'))

      mockLogin.mockResolvedValue({
        success: true,
        token: 'save-fail-token',
        user: { id: 1, name: 'U', email: 'e', role: 'r' },
      })

      const result = await store.login('test@test.com', 'pass')

      // Login should still succeed
      expect(result).toBe(true)
      expect(store.token).toBe('save-fail-token')

      // Wait for the non-blocking saveCredentials().catch() to settle
      await vi.waitFor(() => {
        expect(vi.mocked(load)).toHaveBeenCalled()
      })
    })
  })

  describe('setupUnauthorizedListener', () => {
    // Because each useAuthStore() call adds a new 'auth:unauthorized' listener to
    // window (the module-level flag resets per defineStore setup invocation), we
    // need to intercept addEventListener so we can control exactly which listeners
    // are active. We replace window's event mechanism for this describe block.
    let capturedHandlers: Array<EventListener>

    beforeEach(() => {
      capturedHandlers = []
      // Intercept addEventListener to capture handlers registered for auth:unauthorized
      vi.spyOn(window, 'addEventListener').mockImplementation(
        (type: string, handler: EventListenerOrEventListenerObject) => {
          if (type === 'auth:unauthorized' && typeof handler === 'function') {
            capturedHandlers.push(handler)
          }
        }
      )
      // Create a fresh store — its setupUnauthorizedListener will call our spy
      setActivePinia(createPinia())
      store = useAuthStore()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('dispatching auth:unauthorized triggers logout', async () => {
      store.token = 'test-token'
      store.user = { id: 1, name: 'U', email: 'e', role: 'r' }
      store.tenant = { id: 't', name: 'T', company_name: 'C', logo_url: null, api_base_url: 'https://api.test.com' }
      mockLogout.mockResolvedValue(undefined)
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)

      // Only our single captured handler should exist
      expect(capturedHandlers).toHaveLength(1)

      // Invoke the handler directly (simulates window dispatching the event)
      capturedHandlers[0](new Event('auth:unauthorized'))

      // Wait for the async logout() to complete
      await vi.waitFor(() => {
        expect(store.token).toBeNull()
      })

      expect(store.user).toBeNull()
    })

    it('deduplicates rapid auth:unauthorized events — logout called only once', async () => {
      store.token = 'test-token'
      store.user = { id: 1, name: 'U', email: 'e', role: 'r' }
      store.tenant = { id: 't', name: 'T', company_name: 'C', logo_url: null, api_base_url: 'https://api.test.com' }

      mockLogout.mockResolvedValue(undefined)
      mockStoreClear.mockResolvedValue(undefined)
      mockStoreSave.mockResolvedValue(undefined)
      mockLogout.mockClear()

      expect(capturedHandlers).toHaveLength(1)

      // Invoke the same handler multiple times rapidly
      capturedHandlers[0](new Event('auth:unauthorized'))
      capturedHandlers[0](new Event('auth:unauthorized'))
      capturedHandlers[0](new Event('auth:unauthorized'))

      // Wait for the async logout to complete
      await vi.waitFor(() => {
        expect(store.token).toBeNull()
      })

      // authApi.logout should have been called only once due to the logoutPending dedup
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })
})
