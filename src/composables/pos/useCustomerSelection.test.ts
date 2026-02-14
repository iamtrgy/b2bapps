import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick, defineComponent, h, type EffectScope } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useCustomerSelection } from './useCustomerSelection'
import { useCartStore } from '@/stores/cart'
import { useCustomerStore } from '@/stores/customer'
import type { Customer } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockCustomerGet = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  customerApi: {
    get: (...args: unknown[]) => mockCustomerGet(...args),
    list: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }),
  },
  authApi: {},
  productApi: {
    getAll: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    getBestSellers: vi.fn().mockResolvedValue({ products: [] }),
    getFavorites: vi.fn().mockResolvedValue({ products: [] }),
    search: vi.fn().mockResolvedValue({ products: [] }),
    getDiscounted: vi.fn().mockResolvedValue({ products: [] }),
    getByCategory: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    findByBarcode: vi.fn(),
    updateAvailability: vi.fn(),
    getPurchaseHistory: vi.fn(),
  },
  orderApi: {},
  categoryApi: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  promotionApi: {},
}))

vi.mock('@/services/db', () => ({
  initDB: vi.fn(),
  savePendingOrder: vi.fn().mockResolvedValue(1),
  getPendingOrders: vi.fn().mockResolvedValue([]),
  getPendingOrderCount: vi.fn().mockResolvedValue(0),
  deletePendingOrder: vi.fn(),
  updatePendingOrder: vi.fn(),
  isCacheStale: vi.fn().mockReturnValue(false),
  clearAllCache: vi.fn(),
  deleteDatabase: vi.fn(),
  cacheProducts: vi.fn(),
  getCachedProducts: vi.fn().mockResolvedValue([]),
  getProductCountByIndex: vi.fn().mockResolvedValue(0),
  cacheCustomers: vi.fn(),
  getCachedCustomers: vi.fn().mockResolvedValue([]),
  getCustomerCount: vi.fn().mockResolvedValue(0),
  cacheCategories: vi.fn(),
  getCachedCategories: vi.fn().mockResolvedValue([]),
}))

// Mock localStorage since happy-dom's implementation is incomplete
const localStorageStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
  get length() { return Object.keys(localStorageStore).length },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
}
vi.stubGlobal('localStorage', mockLocalStorage)

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1, company_name: 'Test Co', contact_name: 'John',
    contact_email: 'j@test.com', contact_phone: '555', customer_tier: 'gold',
    ...overrides,
  }
}

describe('useCustomerSelection', () => {
  let scope: EffectScope
  let selection: ReturnType<typeof useCustomerSelection>
  let cartStore: ReturnType<typeof useCartStore>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    // Clear localStorage mock store
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
    setActivePinia(createPinia())
    cartStore = useCartStore()
    scope = effectScope()
    selection = scope.run(() => useCustomerSelection())!
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(selection.selectedCustomer.value).toBeNull()
      expect(selection.customerSearchQuery.value).toBe('')
      expect(selection.showCustomerDetail.value).toBe(false)
      expect(selection.customerDetailTab.value).toBe('info')
      expect(selection.customerDetail.value).toBeNull()
    })
  })

  describe('handleCustomerSelect', () => {
    it('sets selected customer and saves to storage', () => {
      const customer = makeCustomer()
      selection.handleCustomerSelect(customer)

      expect(selection.selectedCustomer.value).toEqual(customer)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pos_selected_customer',
        expect.any(String),
      )
    })

    it('triggers watch to set cart customer', async () => {
      const customer = makeCustomer()
      selection.handleCustomerSelect(customer)
      await nextTick()

      expect(cartStore.customer).toEqual(customer)
    })
  })

  describe('clearCustomer', () => {
    it('clears selection and storage', () => {
      selection.handleCustomerSelect(makeCustomer())
      selection.clearCustomer()

      expect(selection.selectedCustomer.value).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pos_selected_customer')
    })

    it('does not clear when in edit mode', () => {
      selection.handleCustomerSelect(makeCustomer())
      cartStore.editingOrderId = 100

      selection.clearCustomer()

      expect(selection.selectedCustomer.value).not.toBeNull()
    })

    it('does not clear when in return mode', () => {
      selection.handleCustomerSelect(makeCustomer())
      cartStore.enterReturnMode()

      selection.clearCustomer()

      expect(selection.selectedCustomer.value).not.toBeNull()
    })
  })

  describe('openCustomerDetail', () => {
    it('opens detail panel and fetches full data', async () => {
      const customer = makeCustomer()
      const fullData = { ...customer, extra: true }
      mockCustomerGet.mockResolvedValue(fullData)

      selection.handleCustomerSelect(customer)
      await selection.openCustomerDetail()

      expect(selection.showCustomerDetail.value).toBe(true)
      expect(selection.customerDetailTab.value).toBe('info')
      expect(mockCustomerGet).toHaveBeenCalledWith(1)
    })

    it('does nothing when no customer selected', async () => {
      await selection.openCustomerDetail()

      expect(selection.showCustomerDetail.value).toBe(false)
      expect(mockCustomerGet).not.toHaveBeenCalled()
    })
  })

  describe('handleCustomerSearch', () => {
    it('debounces customer search by 300ms', () => {
      const customerStore = useCustomerStore()
      const spy = vi.spyOn(customerStore, 'searchCustomers').mockResolvedValue()

      selection.customerSearchQuery.value = 'test'
      selection.handleCustomerSearch()

      expect(spy).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)

      expect(spy).toHaveBeenCalledWith('test')
    })
  })

  describe('localStorage persistence', () => {
    it('saves customer to localStorage', () => {
      const customer = makeCustomer({ id: 42 })
      selection.saveCustomerToStorage(customer)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pos_selected_customer',
        expect.stringContaining('"id":42'),
      )
    })

    it('removes from localStorage on null', () => {
      selection.saveCustomerToStorage(makeCustomer())
      selection.saveCustomerToStorage(null)

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pos_selected_customer')
    })

    it('loads customer from localStorage', () => {
      const customer = makeCustomer({ id: 99 })
      localStorageStore['pos_selected_customer'] = JSON.stringify(customer)

      const loaded = selection.loadCustomerFromStorage()
      expect(loaded?.id).toBe(99)
    })

    it('returns null for invalid localStorage data', () => {
      localStorageStore['pos_selected_customer'] = 'not-json'
      const loaded = selection.loadCustomerFromStorage()
      expect(loaded).toBeNull()
    })

    it('returns null when no stored customer', () => {
      const loaded = selection.loadCustomerFromStorage()
      expect(loaded).toBeNull()
    })
  })

  describe('openCustomerDetail error handling', () => {
    it('handles API error gracefully when fetching customer detail', async () => {
      const customer = makeCustomer()
      mockCustomerGet.mockRejectedValue(new Error('Network error'))

      selection.handleCustomerSelect(customer)
      await selection.openCustomerDetail()

      // Should still show the detail panel with initial data
      expect(selection.showCustomerDetail.value).toBe(true)
      expect(selection.customerDetail.value).toEqual(customer)
    })
  })

  describe('handleCustomerSearch debounce cancellation', () => {
    it('cancels previous debounce on new search', () => {
      const customerStore = useCustomerStore()
      const spy = vi.spyOn(customerStore, 'searchCustomers').mockResolvedValue()

      selection.customerSearchQuery.value = 'first'
      selection.handleCustomerSearch()

      vi.advanceTimersByTime(100)

      selection.customerSearchQuery.value = 'second'
      selection.handleCustomerSearch()

      vi.advanceTimersByTime(300)

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('second')
    })
  })

  describe('clearCustomer with null selection', () => {
    it('clears when no customer is in edit or return mode', () => {
      selection.handleCustomerSelect(makeCustomer())
      selection.clearCustomer()
      expect(selection.selectedCustomer.value).toBeNull()
    })
  })

  describe('onUnmounted cleanup', () => {
    it('clears customer search timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const TestComponent = defineComponent({
        setup() {
          const sel = useCustomerSelection()
          // Trigger a debounced search so a timeout is scheduled
          sel.customerSearchQuery.value = 'cleanup-test'
          sel.handleCustomerSearch()
          return () => h('div')
        },
      })

      const wrapper = mount(TestComponent, {
        global: { plugins: [createPinia()] },
      })

      // Unmount the component, which triggers onUnmounted and should clear the timeout
      const callsBefore = clearTimeoutSpy.mock.calls.length
      wrapper.unmount()

      // clearTimeout should have been called at least once more after unmount
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callsBefore)
      clearTimeoutSpy.mockRestore()
    })
  })
})
