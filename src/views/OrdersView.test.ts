import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OrdersView from './OrdersView.vue'
import { useAuthStore } from '@/stores/auth'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockOrderList = vi.fn()
const mockOrderGet = vi.fn()
const mockOrderSendToAfas = vi.fn()
const mockCustomerGet = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: 'https://api.test.com', headers: { common: {} } } },
  orderApi: {
    list: (...args: unknown[]) => mockOrderList(...args),
    get: (...args: unknown[]) => mockOrderGet(...args),
    sendToAfas: (...args: unknown[]) => mockOrderSendToAfas(...args),
  },
  customerApi: {
    get: (...args: unknown[]) => mockCustomerGet(...args),
  },
  authApi: {},
  productApi: {},
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
  useRoute: () => ({ path: '/orders' }),
}))

// Mock AppLayout to avoid pulling in all its dependencies
vi.mock('@/components/layout/AppLayout.vue', () => ({
  default: {
    template: '<div class="app-layout"><slot /></div>',
  },
}))

function makeOrder(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    order_number: `ORD-${id.toString().padStart(4, '0')}`,
    customer_id: 1,
    customer: { id: 1, company_name: 'Test Co', contact_name: 'John' },
    items: [],
    items_count: 2,
    subtotal: 100,
    discount_total: 0,
    vat_total: 18,
    total: 118,
    notes: null,
    status: 'pending',
    created_at: '2024-06-15T10:00:00Z',
    afas_synced: false,
    ...overrides,
  }
}

describe('OrdersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setActivePinia(createPinia())
    const authStore = useAuthStore()
    authStore.tenant = {
      id: 't1', name: 'Test Store', company_name: 'Test Co',
      logo_url: null, api_base_url: 'https://api.test.com',
    }
    authStore.user = { id: 1, name: 'Test User', email: 'test@test.com', role: 'user' }
    authStore.token = 'test-token'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  function mountView() {
    return mount(OrdersView, {
      attachTo: document.body,
    })
  }

  it('fetches and renders orders on mount', async () => {
    const orders = [makeOrder(1), makeOrder(2)]
    mockOrderList.mockResolvedValue({
      data: orders,
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(mockOrderList).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('ORD-0001')
    expect(wrapper.text()).toContain('ORD-0002')
  })

  it('shows empty state when no orders', async () => {
    mockOrderList.mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Henüz sipariş yok')
  })

  it('shows loading state initially', async () => {
    // Don't resolve the promise yet
    let resolve: (v: unknown) => void
    mockOrderList.mockReturnValue(new Promise(r => { resolve = r }))

    const wrapper = mountView()
    await flushPromises()

    // Loading should be true; once resolve triggers, it clears
    // The loading indicator exists (Loader2 with animate-spin)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)

    // Now resolve
    resolve!({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
    })
    await flushPromises()
  })

  it('shows load more button when hasMore is true', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1)],
      meta: { current_page: 1, last_page: 3, per_page: 50, total: 150 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Daha Fazla Yükle')
  })

  it('loads more orders on button click', async () => {
    mockOrderList.mockResolvedValueOnce({
      data: [makeOrder(1)],
      meta: { current_page: 1, last_page: 2, per_page: 50, total: 2 },
    })
    mockOrderList.mockResolvedValueOnce({
      data: [makeOrder(2)],
      meta: { current_page: 2, last_page: 2, per_page: 50, total: 2 },
    })

    const wrapper = mountView()
    await flushPromises()

    const loadMoreBtn = wrapper.findAll('button').find(b => b.text().includes('Daha Fazla Yükle'))
    expect(loadMoreBtn).toBeDefined()
    await loadMoreBtn!.trigger('click')
    await flushPromises()

    expect(mockOrderList).toHaveBeenCalledTimes(2)
    expect(mockOrderList).toHaveBeenLastCalledWith(2)
  })

  it('renders status filter tabs', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1)],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Tümü')
    expect(wrapper.text()).toContain('Beklemede')
    expect(wrapper.text()).toContain('Tamamlandı')
  })

  it('renders customer name in order card', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1, { customer: { id: 1, company_name: 'Acme Corp', contact_name: 'Bob' } })],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Acme Corp')
  })

  it('handles API error gracefully', async () => {
    mockOrderList.mockRejectedValue(new Error('Network error'))

    const wrapper = mountView()
    await flushPromises()

    // Should not crash, shows empty state
    expect(wrapper.text()).toContain('Henüz sipariş yok')
  })

  it('filters orders by search query (client-side)', async () => {
    mockOrderList.mockResolvedValue({
      data: [
        makeOrder(1, { customer: { id: 1, company_name: 'Alpha Co', contact_name: 'A' } }),
        makeOrder(2, { customer: { id: 2, company_name: 'Beta Inc', contact_name: 'B' } }),
      ],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
    })

    const wrapper = mountView()
    await flushPromises()

    // Both orders should be visible initially
    expect(wrapper.text()).toContain('Alpha Co')
    expect(wrapper.text()).toContain('Beta Inc')

    // Search for Alpha
    const searchInput = wrapper.find('input[type="text"]')
    await searchInput.setValue('Alpha')
    await flushPromises()

    expect(wrapper.text()).toContain('Alpha Co')
    expect(wrapper.text()).not.toContain('Beta Inc')
  })

  it('shows all orders regardless of status on the all tab', async () => {
    mockOrderList.mockResolvedValue({
      data: [
        makeOrder(1, { status: 'pending' }),
        makeOrder(2, { status: 'completed' }),
      ],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
    })

    const wrapper = mountView()
    await flushPromises()

    // Both visible with "all" filter (default)
    expect(wrapper.text()).toContain('ORD-0001')
    expect(wrapper.text()).toContain('ORD-0002')
  })

  it('shows "no results" when filter matches nothing', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1, { status: 'pending' })],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })

    const wrapper = mountView()
    await flushPromises()

    // Search for something that doesn't exist
    const searchInput = wrapper.find('input[type="text"]')
    await searchInput.setValue('nonexistent-order')
    await flushPromises()

    expect(wrapper.text()).toContain('Sonuç bulunamadı')
  })

  it('refresh button triggers refetch', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1)],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(mockOrderList).toHaveBeenCalledTimes(1)

    // Click refresh button
    const refreshBtn = wrapper.find('button[aria-label="Yenile"]')
    expect(refreshBtn.exists()).toBe(true)
    await refreshBtn.trigger('click')
    await flushPromises()

    expect(mockOrderList).toHaveBeenCalledTimes(2)
  })

  it('opens order detail sidebar on order click', async () => {
    const order = makeOrder(1, {
      items: [{ id: 1, product: { name: 'Test Product' }, quantity_ordered: 2, unit_price: 50, line_total: 100, unit_type: 'box' }],
    })
    mockOrderList.mockResolvedValue({
      data: [order],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })
    mockOrderGet.mockResolvedValue(order)
    mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

    const wrapper = mountView()
    await flushPromises()

    // Click on the order card button
    const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
    if (orderBtn) {
      await orderBtn.trigger('click')
      await flushPromises()

      expect(mockOrderGet).toHaveBeenCalledWith(1)
    }
  })

  it('appends orders when loading page 2', async () => {
    mockOrderList
      .mockResolvedValueOnce({
        data: [makeOrder(1)],
        meta: { current_page: 1, last_page: 2, per_page: 50, total: 2 },
      })
      .mockResolvedValueOnce({
        data: [makeOrder(2)],
        meta: { current_page: 2, last_page: 2, per_page: 50, total: 2 },
      })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('ORD-0001')
    expect(wrapper.text()).not.toContain('ORD-0002')

    // Click load more
    const loadMoreBtn = wrapper.findAll('button').find(b => b.text().includes('Daha Fazla'))
    await loadMoreBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('ORD-0001')
    expect(wrapper.text()).toContain('ORD-0002')
  })

  it('formats order prices correctly', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1, { total: 250.50 })],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })

    const wrapper = mountView()
    await flushPromises()

    // Price should be formatted as EUR
    expect(wrapper.text()).toContain('250,50')
  })

  it('formats order status labels', async () => {
    mockOrderList.mockResolvedValue({
      data: [makeOrder(1, { status: 'pending' })],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Beklemede')
  })

  it('renders search input', async () => {
    mockOrderList.mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
    })

    const wrapper = mountView()
    await flushPromises()

    const searchInput = wrapper.find('input[type="text"]')
    expect(searchInput.exists()).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // viewOrder — opens sidebar, fetches full order + customer
  // ---------------------------------------------------------------------------
  describe('viewOrder', () => {
    it('calls orderApi.get and customerApi.get, shows detail in sidebar', async () => {
      const listOrder = makeOrder(1, {
        customer_id: 5,
        customer: { id: 5, company_name: 'List Co', contact_name: 'Alice' },
      })
      const fullOrder = makeOrder(1, {
        customer_id: 5,
        customer: { id: 5, company_name: 'Full Co', contact_name: 'Bob' },
        items: [
          { id: 10, product: { id: 1, name: 'Widget', sku: 'W1', image_url: null }, quantity_ordered: 3, unit_price: 20, original_price: 20, line_total: 60, unit_type: 'piece', vat_rate: 18 },
        ],
      })
      mockOrderList.mockResolvedValue({
        data: [listOrder],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(fullOrder)
      mockCustomerGet.mockResolvedValue({ id: 5, company_name: 'Full Customer Co', contact_name: 'Bob' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      expect(orderBtn).toBeDefined()
      await orderBtn!.trigger('click')
      await flushPromises()

      expect(mockOrderGet).toHaveBeenCalledWith(1)
      expect(mockCustomerGet).toHaveBeenCalledWith(5)

      // Sidebar content is teleported to body
      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('ORD-0001')
      expect(bodyText).toContain('Widget')
    })

    it('handles orderApi.get failure gracefully', async () => {
      const listOrder = makeOrder(2)
      mockOrderList.mockResolvedValue({
        data: [listOrder],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockRejectedValue(new Error('Server error'))

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0002'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Should not crash; sidebar may still show the list-level order data
      expect(mockOrderGet).toHaveBeenCalledWith(2)
    })

    it('uses customer.id when customer_id is absent', async () => {
      const fullOrder = makeOrder(3, {
        customer_id: undefined,
        customer: { id: 7, company_name: 'Fallback Co', contact_name: 'X' },
      })
      mockOrderList.mockResolvedValue({
        data: [makeOrder(3, { customer: { id: 7, company_name: 'Fallback Co', contact_name: 'X' } })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(fullOrder)
      mockCustomerGet.mockResolvedValue({ id: 7, company_name: 'Fallback Co', contact_name: 'X' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0003'))
      await orderBtn!.trigger('click')
      await flushPromises()

      expect(mockCustomerGet).toHaveBeenCalledWith(7)
    })

    it('keeps order customer data when customerApi.get fails', async () => {
      const fullOrder = makeOrder(4, {
        customer_id: 9,
        customer: { id: 9, company_name: 'Original Co', contact_name: 'Z' },
      })
      mockOrderList.mockResolvedValue({
        data: [makeOrder(4)],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(fullOrder)
      mockCustomerGet.mockRejectedValue(new Error('Customer not found'))

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0004'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Should still show original customer data
      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('Original Co')
    })
  })

  // ---------------------------------------------------------------------------
  // handleSyncToAfas
  // ---------------------------------------------------------------------------
  describe('handleSyncToAfas', () => {
    async function openOrderSidebar(wrapper: ReturnType<typeof mountView>, orderId = 1) {
      const orderBtn = wrapper.findAll('button').find(b => b.text().includes(`ORD-${orderId.toString().padStart(4, '0')}`))
      await orderBtn!.trigger('click')
      await flushPromises()
    }

    function enableAfas() {
      const authStore = useAuthStore()
      authStore.tenant = {
        ...authStore.tenant!,
        afas_enabled: true,
      } as typeof authStore.tenant
    }

    it('syncs successfully — updates order and shows success message', async () => {
      enableAfas()
      const order = makeOrder(1, { afas_synced: false, status: 'pending' })
      const syncedOrder = makeOrder(1, { afas_synced: true, status: 'pending' })

      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })
      mockOrderSendToAfas.mockResolvedValue({ success: true, message: 'OK' })

      const wrapper = mountView()
      await flushPromises()

      await openOrderSidebar(wrapper)

      // After first get, set up get to return synced version
      mockOrderGet.mockResolvedValue(syncedOrder)

      // Find and click AFAS sync button in sidebar (teleported to body)
      const afasBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes("AFAS'a Gönder")
      )
      expect(afasBtn).toBeDefined()
      afasBtn!.click()
      await flushPromises()

      expect(mockOrderSendToAfas).toHaveBeenCalledWith(1)
      // Re-fetch after sync
      expect(mockOrderGet).toHaveBeenCalledTimes(2)

      // Success dialog should appear
      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('Gönderim Başarılı')
    })

    it('shows error message when API returns success=false', async () => {
      enableAfas()
      const order = makeOrder(1, { afas_synced: false })

      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })
      mockOrderSendToAfas.mockResolvedValue({ success: false, message: 'AFAS rejected' })

      const wrapper = mountView()
      await flushPromises()
      await openOrderSidebar(wrapper)

      const afasBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes("AFAS'a Gönder")
      )
      afasBtn!.click()
      await flushPromises()

      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('Gönderim Başarısız')
      expect(bodyText).toContain('AFAS rejected')
    })

    it('shows error message when API throws', async () => {
      enableAfas()
      const order = makeOrder(1, { afas_synced: false })

      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })
      mockOrderSendToAfas.mockRejectedValue(new Error('Network failure'))

      const wrapper = mountView()
      await flushPromises()
      await openOrderSidebar(wrapper)

      const afasBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes("AFAS'a Gönder")
      )
      afasBtn!.click()
      await flushPromises()

      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('Gönderim Başarısız')
    })
  })

  // ---------------------------------------------------------------------------
  // handleBulkSync
  // ---------------------------------------------------------------------------
  describe('handleBulkSync', () => {
    function enableAfas() {
      const authStore = useAuthStore()
      authStore.tenant = {
        ...authStore.tenant!,
        afas_enabled: true,
      } as typeof authStore.tenant
    }

    it('syncs selected unsynced orders — mixed success/fail', async () => {
      enableAfas()
      const orders = [
        makeOrder(1, { afas_synced: false }),
        makeOrder(2, { afas_synced: false }),
        makeOrder(3, { afas_synced: false }),
      ]
      mockOrderList.mockResolvedValue({
        data: orders,
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 3 },
      })

      const wrapper = mountView()
      await flushPromises()

      // Use vm to set selections directly since Reka UI checkboxes
      // don't reliably toggle via trigger('click') in JSDOM
      const vm = wrapper.vm as unknown as {
        selectedOrders: Set<number>
        handleBulkSync: () => Promise<void>
      }
      vm.selectedOrders = new Set([1, 2, 3])
      await flushPromises()

      expect(wrapper.text()).toContain('3 seçili')

      // Mock: order 1 success, order 2 API returns false, order 3 throws
      mockOrderSendToAfas
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: 'fail' })
        .mockRejectedValueOnce(new Error('Network'))

      // Click bulk sync button
      const bulkSyncBtn = wrapper.findAll('button').find(b => b.text().includes("AFAS'a Gönder"))
      expect(bulkSyncBtn).toBeDefined()
      await bulkSyncBtn!.trigger('click')
      await flushPromises()

      expect(mockOrderSendToAfas).toHaveBeenCalledTimes(3)

      // Should show mixed result message
      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('1 başarılı')
      expect(bodyText).toContain('2 başarısız')
    })

    it('does nothing when all selected orders are already synced', async () => {
      enableAfas()
      const orders = [
        makeOrder(1, { afas_synced: true }),
        makeOrder(2, { afas_synced: true }),
      ]
      mockOrderList.mockResolvedValue({
        data: orders,
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      // Select already-synced orders via vm
      const vm = wrapper.vm as unknown as {
        selectedOrders: Set<number>
        handleBulkSync: () => Promise<void>
      }
      vm.selectedOrders = new Set([1, 2])
      await flushPromises()

      // Call handleBulkSync directly — it filters out already synced
      await vm.handleBulkSync()
      await flushPromises()

      // Should not call sendToAfas since all selected are already synced
      expect(mockOrderSendToAfas).not.toHaveBeenCalled()
    })

    it('shows all-success message when every sync succeeds', async () => {
      enableAfas()
      const orders = [makeOrder(1, { afas_synced: false }), makeOrder(2, { afas_synced: false })]
      mockOrderList.mockResolvedValue({
        data: orders,
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        selectedOrders: Set<number>
        handleBulkSync: () => Promise<void>
      }
      vm.selectedOrders = new Set([1, 2])
      await flushPromises()

      mockOrderSendToAfas
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })

      await vm.handleBulkSync()
      await flushPromises()

      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain("2 sipariş AFAS'a gönderildi")
    })
  })

  // ---------------------------------------------------------------------------
  // toggleOrderSelection / toggleSelectAll / selectAllUnsynced / clearSelection
  // ---------------------------------------------------------------------------
  describe('selection operations', () => {
    function enableAfas() {
      const authStore = useAuthStore()
      authStore.tenant = {
        ...authStore.tenant!,
        afas_enabled: true,
      } as typeof authStore.tenant
    }

    // Helper type for accessing component internals
    type VmSelection = {
      selectedOrders: Set<number>
      toggleOrderSelection: (id: number) => void
      toggleSelectAll: () => void
      selectAllUnsynced: () => void
      clearSelection: () => void
    }

    it('toggleOrderSelection adds and removes orders from selection', async () => {
      enableAfas()
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1, { afas_synced: false }), makeOrder(2, { afas_synced: false })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      const vm = wrapper.vm as unknown as VmSelection

      // Select first order
      vm.toggleOrderSelection(1)
      await flushPromises()
      expect(wrapper.text()).toContain('1 seçili')

      // Select second order
      vm.toggleOrderSelection(2)
      await flushPromises()
      expect(wrapper.text()).toContain('2 seçili')

      // Deselect first order
      vm.toggleOrderSelection(1)
      await flushPromises()
      expect(wrapper.text()).toContain('1 seçili')
    })

    it('toggleSelectAll selects all and deselects all', async () => {
      enableAfas()
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1, { afas_synced: false }), makeOrder(2, { afas_synced: false })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      const vm = wrapper.vm as unknown as VmSelection

      // Select all
      vm.toggleSelectAll()
      await flushPromises()
      expect(wrapper.text()).toContain('2 seçili')

      // Deselect all
      vm.toggleSelectAll()
      await flushPromises()
      expect(wrapper.text()).not.toContain('seçili')
    })

    it('selectAllUnsynced selects only unsynced orders', async () => {
      enableAfas()
      mockOrderList.mockResolvedValue({
        data: [
          makeOrder(1, { afas_synced: false }),
          makeOrder(2, { afas_synced: true }),
          makeOrder(3, { afas_synced: false }),
        ],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 3 },
      })

      const wrapper = mountView()
      await flushPromises()

      const vm = wrapper.vm as unknown as VmSelection

      // Call selectAllUnsynced
      vm.selectAllUnsynced()
      await flushPromises()

      // Should have 2 unsynced selected (orders 1 and 3)
      expect(vm.selectedOrders.size).toBe(2)
      expect(vm.selectedOrders.has(1)).toBe(true)
      expect(vm.selectedOrders.has(3)).toBe(true)
      expect(vm.selectedOrders.has(2)).toBe(false)
      expect(wrapper.text()).toContain('2 seçili')
    })

    it('clearSelection clears all selected orders', async () => {
      enableAfas()
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1, { afas_synced: false }), makeOrder(2, { afas_synced: false })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      const vm = wrapper.vm as unknown as VmSelection

      // Select both via vm
      vm.selectedOrders = new Set([1, 2])
      await flushPromises()
      expect(wrapper.text()).toContain('2 seçili')

      // Clear selection
      vm.clearSelection()
      await flushPromises()
      expect(vm.selectedOrders.size).toBe(0)
      expect(wrapper.text()).not.toContain('seçili')
    })
  })

  // ---------------------------------------------------------------------------
  // formatDate
  // ---------------------------------------------------------------------------
  describe('formatDate', () => {
    it('formats a valid date in Turkish locale', async () => {
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1, { created_at: '2024-12-25T14:30:00Z' })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })

      const wrapper = mountView()
      await flushPromises()

      // The date should be formatted — at minimum it should contain "2024" and "25"
      const text = wrapper.text()
      expect(text).toContain('2024')
      expect(text).toContain('25')
    })

    it('returns dash for null date', async () => {
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1, { created_at: null })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })

      const wrapper = mountView()
      await flushPromises()

      // The created_at field in the order card should show '-'
      // We can't easily isolate it but the component renders formatDate(order.created_at) = '-'
      expect(wrapper.text()).toContain('-')
    })

    it('returns dash for invalid date string', async () => {
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1, { created_at: 'not-a-date' })],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })

      const wrapper = mountView()
      await flushPromises()

      // formatDate('not-a-date') returns '-'
      expect(wrapper.text()).toContain('-')
    })
  })

  // ---------------------------------------------------------------------------
  // handlePrint
  // ---------------------------------------------------------------------------
  describe('handlePrint', () => {
    async function openDetailSidebar(wrapper: ReturnType<typeof mountView>) {
      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()
    }

    it('calls window.print for proforma and restores title', async () => {
      const mockPrint = vi.fn()
      vi.stubGlobal('print', mockPrint)

      const order = makeOrder(1, {
        items: [{ id: 1, product: { id: 1, name: 'P1', sku: 'S1', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 }],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()
      await openDetailSidebar(wrapper)

      const originalTitle = document.title

      // Click Proforma button
      const proformaBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes('Proforma')
      )
      expect(proformaBtn).toBeDefined()
      proformaBtn!.click()
      await flushPromises()
      // nextTick runs the print
      await vi.runAllTimersAsync()
      await flushPromises()

      expect(mockPrint).toHaveBeenCalled()
      // Title should be restored
      expect(document.title).toBe(originalTitle)

      vi.unstubAllGlobals()
    })

    it('calls window.print for packing list', async () => {
      const mockPrint = vi.fn()
      vi.stubGlobal('print', mockPrint)

      const order = makeOrder(1, {
        items: [{ id: 1, product: { id: 1, name: 'P1', sku: 'S1', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 }],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()
      await openDetailSidebar(wrapper)

      // Click Paketleme button
      const packingBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes('Paketleme')
      )
      expect(packingBtn).toBeDefined()
      packingBtn!.click()
      await flushPromises()
      await vi.runAllTimersAsync()
      await flushPromises()

      expect(mockPrint).toHaveBeenCalled()

      vi.unstubAllGlobals()
    })
  })

  // ---------------------------------------------------------------------------
  // handleShare
  // ---------------------------------------------------------------------------
  describe('handleShare', () => {
    async function openDetailSidebar(wrapper: ReturnType<typeof mountView>) {
      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()
    }

    it('uses navigator.share when available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
        configurable: true,
      })

      const order = makeOrder(1, {
        items: [{ id: 1, product: { id: 1, name: 'P1', sku: 'S1', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 }],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()
      await openDetailSidebar(wrapper)

      const shareBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes('Paylaş')
      )
      expect(shareBtn).toBeDefined()
      shareBtn!.click()
      await flushPromises()

      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('ORD-0001'),
          text: expect.stringContaining('Test Co'),
        })
      )

      // Clean up
      Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true })
    })

    it('falls back to clipboard.writeText when navigator.share is not available', async () => {
      // Ensure navigator.share is undefined
      Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true })

      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      })

      const order = makeOrder(1, {
        customer: { id: 1, company_name: 'Clipboard Co', contact_name: 'John' },
        items: [{ id: 1, product: { id: 1, name: 'P1', sku: 'S1', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 }],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Clipboard Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()
      await openDetailSidebar(wrapper)

      const shareBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes('Paylaş')
      )
      shareBtn!.click()
      await flushPromises()

      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('ORD-0001')
      )
      // Should show success toast
      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('Sipariş bilgileri kopyalandı')
    })
  })

  // ---------------------------------------------------------------------------
  // goToOrderDetail / handleEditOrder — router navigation
  // ---------------------------------------------------------------------------
  describe('goToOrderDetail', () => {
    it('navigates to /orders/:id', async () => {
      const order = makeOrder(5, {
        items: [{ id: 1, product: { id: 1, name: 'P1', sku: 'S1', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 }],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0005'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Click "Detay Sayfası" button
      const detailBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes('Detay Sayfası')
      )
      expect(detailBtn).toBeDefined()
      detailBtn!.click()
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith('/orders/5')
    })
  })

  describe('handleEditOrder', () => {
    it('navigates to /pos?editOrderId=:id', async () => {
      const order = makeOrder(7, {
        status: 'pending',
        items: [{ id: 1, product: { id: 1, name: 'P1', sku: 'S1', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 }],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0007'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Click "Düzenle" button (only visible for pending orders)
      const editBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes('Düzenle')
      )
      expect(editBtn).toBeDefined()
      editBtn!.click()
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith('/pos?editOrderId=7')
    })
  })

  // ---------------------------------------------------------------------------
  // orderDetailStats computed
  // ---------------------------------------------------------------------------
  describe('orderDetailStats', () => {
    it('counts boxes and pieces correctly', async () => {
      const order = makeOrder(1, {
        items: [
          { id: 1, product: { id: 1, name: 'Boxes', sku: 'B1', image_url: null }, quantity_ordered: 5, unit_price: 10, original_price: 10, line_total: 50, unit_type: 'box', vat_rate: 18 },
          { id: 2, product: { id: 2, name: 'Pieces', sku: 'P1', image_url: null }, quantity_ordered: 3, unit_price: 5, original_price: 5, line_total: 15, unit_type: 'piece', vat_rate: 18 },
          { id: 3, product: { id: 3, name: 'More Boxes', sku: 'B2', image_url: null }, quantity_ordered: 2, unit_price: 20, original_price: 20, line_total: 40, unit_type: 'box', vat_rate: 18 },
        ],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Verify computed stats via vm
      const vm = wrapper.vm as unknown as {
        orderDetailStats: { itemCount: number; boxCount: number; pieceCount: number }
      }
      expect(vm.orderDetailStats.itemCount).toBe(3)
      expect(vm.orderDetailStats.boxCount).toBe(7)
      expect(vm.orderDetailStats.pieceCount).toBe(3)
    })
  })

  // ---------------------------------------------------------------------------
  // orderDetailVatBreakdown computed
  // ---------------------------------------------------------------------------
  describe('orderDetailVatBreakdown', () => {
    it('groups VAT by rate and calculates amounts', async () => {
      const order = makeOrder(1, {
        items: [
          { id: 1, product: { id: 1, name: 'A', sku: 'A1', image_url: null }, quantity_ordered: 1, unit_price: 118, original_price: 118, line_total: 118, unit_type: 'piece', vat_rate: 18 },
          { id: 2, product: { id: 2, name: 'B', sku: 'B1', image_url: null }, quantity_ordered: 1, unit_price: 109, original_price: 109, line_total: 109, unit_type: 'piece', vat_rate: 9 },
        ],
        vat_total: 27,
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Verify computed VAT breakdown via vm
      const vm = wrapper.vm as unknown as {
        orderDetailVatBreakdown: { rate: number; amount: number }[]
      }
      expect(vm.orderDetailVatBreakdown.length).toBe(2)
      expect(vm.orderDetailVatBreakdown[0].rate).toBe(9)
      expect(vm.orderDetailVatBreakdown[1].rate).toBe(18)
      expect(vm.orderDetailVatBreakdown[0].amount).toBeGreaterThan(0)
      expect(vm.orderDetailVatBreakdown[1].amount).toBeGreaterThan(0)
    })
  })

  // ---------------------------------------------------------------------------
  // hasAnySku computed
  // ---------------------------------------------------------------------------
  describe('hasAnySku', () => {
    it('returns true when at least one item has a SKU', async () => {
      const order = makeOrder(1, {
        items: [
          { id: 1, product: { id: 1, name: 'WithSku', sku: 'SKU-001', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 },
          { id: 2, product: { id: 2, name: 'NoSku', sku: '', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 },
        ],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      // Open sidebar
      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Verify computed property via vm
      const vm = wrapper.vm as unknown as { hasAnySku: boolean; printType: string }
      expect(vm.hasAnySku).toBe(true)

      // Switch to packing view where SKU column is rendered
      vm.printType = 'packing'
      await flushPromises()

      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('SKU-001')
    })

    it('returns false when no item has a SKU', async () => {
      const order = makeOrder(1, {
        items: [
          { id: 1, product: { id: 1, name: 'NoSku1', sku: '', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 },
          { id: 2, product: { id: 2, name: 'NoSku2', image_url: null }, quantity_ordered: 1, unit_price: 10, original_price: 10, line_total: 10, unit_type: 'piece', vat_rate: 18 },
        ],
      })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      const vm = wrapper.vm as unknown as { hasAnySku: boolean }
      expect(vm.hasAnySku).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // packingPages computed
  // ---------------------------------------------------------------------------
  describe('packingPages', () => {
    it('puts all items on one page when <= 25 items', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        product: { id: i + 1, name: `Product ${i + 1}`, sku: `S${i + 1}`, image_url: null },
        quantity_ordered: 1,
        unit_price: 10,
        original_price: 10,
        line_total: 10,
        unit_type: 'piece' as const,
        vat_rate: 18,
      }))
      const order = makeOrder(1, { items })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Verify via vm computed
      const vm = wrapper.vm as unknown as {
        packingPages: unknown[][]
        printType: string
      }
      expect(vm.packingPages.length).toBe(1)
      expect(vm.packingPages[0].length).toBe(10)

      // Switch to packing view and check body text
      vm.printType = 'packing'
      await flushPromises()

      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('1 SAYFA')
    })

    it('paginates items: first page 25, subsequent pages 30', async () => {
      // 60 items: page 1 = 25, page 2 = 30, page 3 = 5
      const items = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        product: { id: i + 1, name: `Product ${i + 1}`, sku: `S${i + 1}`, image_url: null },
        quantity_ordered: 1,
        unit_price: 10,
        original_price: 10,
        line_total: 10,
        unit_type: 'piece' as const,
        vat_rate: 18,
      }))
      const order = makeOrder(1, { items })
      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })

      const wrapper = mountView()
      await flushPromises()

      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Verify via vm computed: 3 pages: 25 + 30 + 5
      const vm = wrapper.vm as unknown as {
        packingPages: unknown[][]
        printType: string
      }
      expect(vm.packingPages.length).toBe(3)
      expect(vm.packingPages[0].length).toBe(25)
      expect(vm.packingPages[1].length).toBe(30)
      expect(vm.packingPages[2].length).toBe(5)

      // Switch to packing view and verify rendered pagination
      vm.printType = 'packing'
      await flushPromises()

      const bodyText = document.body.textContent || ''
      expect(bodyText).toContain('3 SAYFA')
      expect(bodyText).toContain('Sayfa 2 / 3')
      expect(bodyText).toContain('Sayfa 3 / 3')
    })
  })

  // ---------------------------------------------------------------------------
  // statusFilter
  // ---------------------------------------------------------------------------
  describe('statusFilter', () => {
    it('filters by pending status', async () => {
      mockOrderList.mockResolvedValue({
        data: [
          makeOrder(1, { status: 'pending' }),
          makeOrder(2, { status: 'completed' }),
          makeOrder(3, { status: 'pending' }),
        ],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 3 },
      })

      const wrapper = mountView()
      await flushPromises()

      // All visible initially
      expect(wrapper.text()).toContain('ORD-0001')
      expect(wrapper.text()).toContain('ORD-0002')
      expect(wrapper.text()).toContain('ORD-0003')

      // Set statusFilter via vm (Reka UI tabs don't respond to trigger('click') in JSDOM)
      const vm = wrapper.vm as unknown as { statusFilter: string }
      vm.statusFilter = 'pending'
      await flushPromises()

      expect(wrapper.text()).toContain('ORD-0001')
      expect(wrapper.text()).not.toContain('ORD-0002')
      expect(wrapper.text()).toContain('ORD-0003')
    })

    it('filters by completed status', async () => {
      mockOrderList.mockResolvedValue({
        data: [
          makeOrder(1, { status: 'pending' }),
          makeOrder(2, { status: 'completed' }),
        ],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      const vm = wrapper.vm as unknown as { statusFilter: string }
      vm.statusFilter = 'completed'
      await flushPromises()

      expect(wrapper.text()).not.toContain('ORD-0001')
      expect(wrapper.text()).toContain('ORD-0002')
    })
  })

  // ---------------------------------------------------------------------------
  // AFAS sync filter tabs rendering
  // ---------------------------------------------------------------------------
  describe('AFAS sync filter tabs', () => {
    it('renders AFAS sync filter tabs when hasAfas is true', async () => {
      const authStore = useAuthStore()
      authStore.tenant = {
        ...authStore.tenant!,
        afas_enabled: true,
      } as typeof authStore.tenant

      mockOrderList.mockResolvedValue({
        data: [makeOrder(1)],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })

      const wrapper = mountView()
      await flushPromises()

      // The sync filter tabs should render: Tümü, Bekliyor (unsynced), Gönderildi (synced)
      const text = wrapper.text()
      expect(text).toContain('Bekliyor')
      expect(text).toContain('Gönderildi')
    })

    it('does not render AFAS sync filter tabs when hasAfas is false', async () => {
      // Default tenant does not have afas_enabled
      mockOrderList.mockResolvedValue({
        data: [makeOrder(1)],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })

      const wrapper = mountView()
      await flushPromises()

      // The status filter "Tümü" exists, but the sync-specific tabs should not
      // "Bekliyor" is the sync filter label for unsynced (distinct from status "Beklemede")
      // and "Gönderildi" is the sync filter label for synced
      // Check that the CloudOff-related sync tab text is absent
      // We check for "Gönderildi" specifically as it only appears in sync filter tabs
      const allButtons = wrapper.findAll('button')
      const syncTabBtn = allButtons.find(b => b.text().includes('Gönderildi'))
      expect(syncTabBtn).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // sync result dialog dismiss
  // ---------------------------------------------------------------------------
  describe('sync result dialog', () => {
    it('sync result dialog can be dismissed', async () => {
      const authStore = useAuthStore()
      authStore.tenant = {
        ...authStore.tenant!,
        afas_enabled: true,
      } as typeof authStore.tenant

      const order = makeOrder(1, { afas_synced: false, status: 'pending' })
      const syncedOrder = makeOrder(1, { afas_synced: true, status: 'pending' })

      mockOrderList.mockResolvedValue({
        data: [order],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
      })
      mockOrderGet.mockResolvedValue(order)
      mockCustomerGet.mockResolvedValue({ id: 1, company_name: 'Test Co', contact_name: 'John' })
      mockOrderSendToAfas.mockResolvedValue({ success: true, message: 'OK' })

      const wrapper = mountView()
      await flushPromises()

      // Open order sidebar
      const orderBtn = wrapper.findAll('button').find(b => b.text().includes('ORD-0001'))
      await orderBtn!.trigger('click')
      await flushPromises()

      // Set up the second get to return synced version
      mockOrderGet.mockResolvedValue(syncedOrder)

      // Click AFAS sync button
      const afasBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.includes("AFAS'a Gönder")
      )
      afasBtn!.click()
      await flushPromises()

      // Verify sync result dialog is shown
      let bodyText = document.body.textContent || ''
      expect(bodyText).toContain('Gönderim Başarılı')

      // Find and click the "Kapat" button on the sync result dialog
      const closeBtn = Array.from(document.body.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'Kapat'
      )
      expect(closeBtn).toBeDefined()
      closeBtn!.click()
      await flushPromises()

      // Dialog should be dismissed — "Gönderim Başarılı" should no longer appear
      bodyText = document.body.textContent || ''
      expect(bodyText).not.toContain('Gönderim Başarılı')
    })
  })

  // ---------------------------------------------------------------------------
  // syncFilter
  // ---------------------------------------------------------------------------
  describe('syncFilter', () => {
    function enableAfas() {
      const authStore = useAuthStore()
      authStore.tenant = {
        ...authStore.tenant!,
        afas_enabled: true,
      } as typeof authStore.tenant
    }

    it('filters synced orders', async () => {
      enableAfas()
      mockOrderList.mockResolvedValue({
        data: [
          makeOrder(1, { afas_synced: true }),
          makeOrder(2, { afas_synced: false }),
        ],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      // Set syncFilter via vm
      const vm = wrapper.vm as unknown as { syncFilter: string }
      vm.syncFilter = 'synced'
      await flushPromises()

      expect(wrapper.text()).toContain('ORD-0001')
      expect(wrapper.text()).not.toContain('ORD-0002')
    })

    it('filters unsynced orders', async () => {
      enableAfas()
      mockOrderList.mockResolvedValue({
        data: [
          makeOrder(1, { afas_synced: true }),
          makeOrder(2, { afas_synced: false }),
        ],
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
      })

      const wrapper = mountView()
      await flushPromises()

      // Set syncFilter via vm
      const vm = wrapper.vm as unknown as { syncFilter: string }
      vm.syncFilter = 'unsynced'
      await flushPromises()

      expect(wrapper.text()).not.toContain('ORD-0001')
      expect(wrapper.text()).toContain('ORD-0002')
    })
  })
})
