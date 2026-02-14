import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TenantView from './TenantView.vue'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockVerifyTenant = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  authApi: {
    verifyTenant: (...args: unknown[]) => mockVerifyTenant(...args),
  },
  customerApi: {},
  productApi: {},
  orderApi: {},
  categoryApi: {},
  promotionApi: {},
}))

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), save: vi.fn(), clear: vi.fn() }),
}))
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockResolvedValue('macos'),
  arch: vi.fn().mockResolvedValue('aarch64'),
}))

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockLocalStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value },
  removeItem: (key: string) => { delete mockLocalStorage[key] },
})

describe('TenantView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setActivePinia(createPinia())
    for (const key in mockLocalStorage) delete mockLocalStorage[key]
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  function mountView() {
    return mount(TenantView, {
      attachTo: document.body,
    })
  }

  it('renders the form', () => {
    const wrapper = mountView()
    expect(wrapper.find('input#domain').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('disables submit when domain is empty', () => {
    const wrapper = mountView()
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('enables submit with valid domain', async () => {
    const wrapper = mountView()
    const input = wrapper.find('input#domain')
    await input.setValue('store.b2bnord.com')
    await flushPromises()

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('shows validation error for invalid domain', async () => {
    const wrapper = mountView()
    const input = wrapper.find('input#domain')
    await input.setValue('not a domain!!!')
    await flushPromises()

    // Button should be disabled
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('verifies tenant on submit', async () => {
    mockVerifyTenant.mockResolvedValue({
      success: true,
      tenant: { id: 't1', name: 'Test', company_name: 'TC', logo_url: null, api_base_url: 'https://api.test.com' },
    })

    const wrapper = mountView()
    const input = wrapper.find('input#domain')
    await input.setValue('store.b2bnord.com')
    await flushPromises()

    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()

    expect(mockVerifyTenant).toHaveBeenCalledWith('store.b2bnord.com')
  })

  it('shows success state after verification', async () => {
    mockVerifyTenant.mockResolvedValue({
      success: true,
      tenant: { id: 't1', name: 'Test', company_name: 'TC', logo_url: null, api_base_url: 'https://api.test.com' },
    })

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('store.b2bnord.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Mağaza Bulundu')
  })

  it('navigates to /login after success', async () => {
    mockVerifyTenant.mockResolvedValue({
      success: true,
      tenant: { id: 't1', name: 'Test', company_name: 'TC', logo_url: null, api_base_url: 'https://api.test.com' },
    })

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('store.b2bnord.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    vi.advanceTimersByTime(1000)
    expect(mockRouterPush).toHaveBeenCalledWith('/login')
  })

  it('shows error on failed verification', async () => {
    mockVerifyTenant.mockRejectedValue(new Error('Mağaza bulunamadı'))

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('bad.b2bnord.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Mağaza bulunamadı')
  })

  it('loads recent tenants from localStorage on mount', async () => {
    mockLocalStorage['pos_recent_tenants'] = JSON.stringify(['recent.b2bnord.com', 'old.b2bnord.com'])

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('recent.b2bnord.com')
    expect(wrapper.text()).toContain('old.b2bnord.com')
  })

  it('saves successful tenant to recent tenants list', async () => {
    mockVerifyTenant.mockResolvedValue({
      success: true,
      tenant: { id: 't1', name: 'Test', company_name: 'TC', logo_url: null, api_base_url: 'https://api.test.com' },
    })

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('new.b2bnord.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const stored = JSON.parse(mockLocalStorage['pos_recent_tenants'])
    expect(stored).toContain('new.b2bnord.com')
  })

  it('validates domain with subdomains correctly', async () => {
    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('store.platform.b2bnord.com')
    await flushPromises()
    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('disables input during verification', async () => {
    let resolveVerify: (v: unknown) => void
    mockVerifyTenant.mockReturnValue(new Promise(r => { resolveVerify = r }))

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('store.b2bnord.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const input = wrapper.find('input#domain')
    expect(input.attributes('disabled')).toBeDefined()

    resolveVerify!({
      success: true,
      tenant: { id: 't1', name: 'T', company_name: 'C', logo_url: null, api_base_url: 'https://api.test.com' },
    })
    await flushPromises()
  })

  it('selects recent tenant on click', async () => {
    mockLocalStorage['pos_recent_tenants'] = JSON.stringify(['recent.b2bnord.com'])

    const wrapper = mountView()
    await flushPromises()

    const recentBtn = wrapper.findAll('button').find(b => b.text().includes('recent.b2bnord.com'))
    expect(recentBtn).toBeTruthy()
    await recentBtn!.trigger('click')
    await flushPromises()

    const input = wrapper.find('input#domain')
    expect((input.element as HTMLInputElement).value).toBe('recent.b2bnord.com')
  })

  it('cleans domain input (removes protocol/www/trailing slash)', async () => {
    mockVerifyTenant.mockResolvedValue({
      success: true,
      tenant: { id: 't1', name: 'Test', company_name: 'TC', logo_url: null, api_base_url: 'https://api.test.com' },
    })

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('https://www.store.b2bnord.com/')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockVerifyTenant).toHaveBeenCalledWith('store.b2bnord.com')
  })

  it('handles corrupted localStorage for recent tenants gracefully', async () => {
    mockLocalStorage['pos_recent_tenants'] = 'not valid json{{{['

    const wrapper = mountView()
    await flushPromises()

    // Should not crash and recentTenants should be empty
    expect(wrapper.text()).not.toContain('Son Kullanılanlar')
  })

  it('opens help dialog when clicking the help link', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Find the help trigger button
    const helpButton = wrapper.findAll('button').find(b => b.text().includes('Mağazamı bulamıyorum'))
    expect(helpButton).toBeTruthy()
    await helpButton!.trigger('click')
    await flushPromises()

    // The dialog content should now be visible
    expect(document.body.textContent).toContain('Mağazanızı Bulamıyor musunuz?')
    expect(document.body.textContent).toContain('Aşağıdaki adımları deneyin')
  })

  it('deduplicates recent tenants and limits to max 3', async () => {
    mockLocalStorage['pos_recent_tenants'] = JSON.stringify(['a.com', 'b.com', 'c.com'])

    mockVerifyTenant.mockResolvedValue({
      success: true,
      tenant: { id: 't1', name: 'Test', company_name: 'TC', logo_url: null, api_base_url: 'https://api.test.com' },
    })

    const wrapper = mountView()
    await flushPromises()

    // Submit with an existing tenant (a.com) - should move to front, not duplicate
    await wrapper.find('input#domain').setValue('a.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const stored = JSON.parse(mockLocalStorage['pos_recent_tenants'])
    expect(stored).toHaveLength(3)
    expect(stored[0]).toBe('a.com')
    expect(stored[1]).toBe('b.com')
    expect(stored[2]).toBe('c.com')
  })

  it('uses fallback error message when error has no message', async () => {
    mockVerifyTenant.mockRejectedValue({ notAnError: true })

    const wrapper = mountView()
    await wrapper.find('input#domain').setValue('fail.b2bnord.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // The auth store will wrap this into an error message;
    // either way the error area should be visible
    const errorText = wrapper.text()
    expect(
      errorText.includes('Mağaza bulunamadı') || errorText.includes('Tenant verification failed') || errorText.includes('hata')
    ).toBe(true)
  })
})
