import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

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

describe('App smoke test', () => {
  it('mounts without crashing and renders router-view', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
      ],
    })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    expect(wrapper.html()).toContain('Home')
  })

  it('renders different routes via router-view', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Root</div>' } },
        { path: '/test-page', component: { template: '<div>Test Page</div>' } },
      ],
    })
    router.push('/test-page')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    expect(wrapper.html()).toContain('Test Page')
  })
})
