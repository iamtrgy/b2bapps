import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Stub Tauri native modules
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({ get: vi.fn().mockResolvedValue(null), set: vi.fn(), save: vi.fn() }),
}))
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockReturnValue('macos'),
  arch: vi.fn().mockResolvedValue('aarch64'),
}))
vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' }, interceptors: { response: { use: vi.fn() } } },
  authApi: { verifyTenant: vi.fn(), login: vi.fn() },
  customerApi: { list: vi.fn() },
  orderApi: {},
  productApi: {},
  categoryApi: {},
  promotionApi: {},
}))

// Must import router AFTER mocks are set up
const { default: router } = await import('./index')

describe('router guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    // Reset router to a clean state
    router.push('/')
    await router.isReady()
  })

  it('redirects / to /tenant', async () => {
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/tenant')
  })

  it('redirects protected routes to /tenant when unauthenticated', async () => {
    await router.push('/pos')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('tenant')
  })

  it('redirects /login to /tenant when no tenant is set', async () => {
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('tenant')
  })

  it('allows /tenant when unauthenticated', async () => {
    await router.push('/tenant')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('tenant')
  })

  it('redirects /login and /tenant to /pos when authenticated', async () => {
    const authStore = useAuthStore()
    // Simulate authenticated state
    authStore.$patch({
      token: 'test-token',
      user: { id: 1, name: 'Test', email: 'test@test.com', role: 'admin' },
      tenant: { id: '1', name: 'test', company_name: 'Test', logo_url: null, api_base_url: 'http://localhost' },
    })

    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('pos')
  })
})
