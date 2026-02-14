import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, defineComponent, h, type EffectScope } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useProductBrowsing } from './useProductBrowsing'
import { useProductStore } from '@/stores/products'
import type { Customer } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  productApi: {
    getAll: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    getBestSellers: vi.fn().mockResolvedValue({ products: [] }),
    getFavorites: vi.fn().mockResolvedValue({ products: [] }),
    getDiscounted: vi.fn().mockResolvedValue({ products: [] }),
    getByCategory: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    search: vi.fn().mockResolvedValue({ products: [] }),
    findByBarcode: vi.fn(),
    updateAvailability: vi.fn(),
    getPurchaseHistory: vi.fn(),
  },
  authApi: {},
  customerApi: {},
  orderApi: {},
  categoryApi: {},
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

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1, company_name: 'Test Co', contact_name: 'John',
    contact_email: 'j@test.com', contact_phone: '555', customer_tier: 'gold',
    ...overrides,
  }
}

describe('useProductBrowsing', () => {
  let scope: EffectScope
  let browsing: ReturnType<typeof useProductBrowsing>
  let productStore: ReturnType<typeof useProductStore>
  const selectedCustomer = ref<Customer | null>(makeCustomer())

  // Spies
  let spyLoadAll: ReturnType<typeof vi.spyOn>
  let spyLoadBestSellers: ReturnType<typeof vi.spyOn>
  let spyLoadFavorites: ReturnType<typeof vi.spyOn>
  let spyLoadDiscounted: ReturnType<typeof vi.spyOn>
  let spyLoadByCategory: ReturnType<typeof vi.spyOn>
  let spySearchProducts: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    selectedCustomer.value = makeCustomer()
    setActivePinia(createPinia())
    productStore = useProductStore()

    // Spy on store actions
    spyLoadAll = vi.spyOn(productStore, 'loadAll').mockResolvedValue()
    spyLoadBestSellers = vi.spyOn(productStore, 'loadBestSellers').mockResolvedValue()
    spyLoadFavorites = vi.spyOn(productStore, 'loadFavorites').mockResolvedValue()
    spyLoadDiscounted = vi.spyOn(productStore, 'loadDiscounted').mockResolvedValue()
    spyLoadByCategory = vi.spyOn(productStore, 'loadByCategory').mockResolvedValue()
    spySearchProducts = vi.spyOn(productStore, 'searchProducts').mockResolvedValue()

    scope = effectScope()
    browsing = scope.run(() => useProductBrowsing(selectedCustomer))!
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(browsing.searchQuery.value).toBe('')
      expect(browsing.activeCategoryTab.value).toBe('best-sellers')
      expect(browsing.productGridRef.value).toBeNull()
    })
  })

  describe('handleCategorySelect', () => {
    it('loads all products', () => {
      browsing.handleCategorySelect('all')
      expect(browsing.activeCategoryTab.value).toBe('all')
      expect(browsing.searchQuery.value).toBe('')
      expect(spyLoadAll).toHaveBeenCalledWith(1)
    })

    it('loads best sellers', () => {
      browsing.handleCategorySelect('best-sellers')
      expect(browsing.activeCategoryTab.value).toBe('best-sellers')
      expect(spyLoadBestSellers).toHaveBeenCalledWith(1)
    })

    it('loads favorites', () => {
      browsing.handleCategorySelect('favorites')
      expect(spyLoadFavorites).toHaveBeenCalledWith(1)
    })

    it('loads discounted', () => {
      browsing.handleCategorySelect('discounted')
      expect(spyLoadDiscounted).toHaveBeenCalledWith(1)
    })

    it('loads by category id', () => {
      browsing.handleCategorySelect(42)
      expect(browsing.activeCategoryTab.value).toBe(42)
      expect(spyLoadByCategory).toHaveBeenCalledWith(1, 42)
    })

    it('does nothing when no customer selected', () => {
      selectedCustomer.value = null
      browsing.handleCategorySelect('all')

      expect(browsing.activeCategoryTab.value).toBe('all')
      expect(spyLoadAll).not.toHaveBeenCalled()
    })

    it('clears search query on category select', () => {
      browsing.searchQuery.value = 'test'
      browsing.handleCategorySelect('all')
      expect(browsing.searchQuery.value).toBe('')
    })
  })

  describe('handleSearch', () => {
    it('searches products and switches to search tab', () => {
      browsing.handleSearch('widget')

      expect(browsing.activeCategoryTab.value).toBe('search')
      expect(spySearchProducts).toHaveBeenCalledWith('widget', 1)
    })

    it('does nothing when no customer selected', () => {
      selectedCustomer.value = null
      browsing.handleSearch('widget')

      expect(spySearchProducts).not.toHaveBeenCalled()
    })
  })

  describe('handleSearchInput', () => {
    it('debounces search by 300ms', () => {
      browsing.searchQuery.value = 'test'
      browsing.handleSearchInput()

      expect(spySearchProducts).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)

      expect(spySearchProducts).toHaveBeenCalledWith('test', 1)
    })

    it('cancels previous debounce on new input', () => {
      browsing.searchQuery.value = 'first'
      browsing.handleSearchInput()

      vi.advanceTimersByTime(100)

      browsing.searchQuery.value = 'second'
      browsing.handleSearchInput()

      vi.advanceTimersByTime(300)

      expect(spySearchProducts).toHaveBeenCalledTimes(1)
      expect(spySearchProducts).toHaveBeenCalledWith('second', 1)
    })
  })

  describe('handleProductScroll', () => {
    it('loads more products when near bottom', async () => {
      const spyLoadMore = vi.spyOn(productStore, 'loadMore').mockResolvedValue()
      productStore.$patch({ hasMore: true, isLoadingMore: false })

      const mockTarget = {
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }

      // Mock requestAnimationFrame
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      browsing.handleProductScroll({ target: mockTarget } as unknown as Event)

      expect(spyLoadMore).toHaveBeenCalledWith(1)
    })

    it('does not load more when not near bottom', () => {
      const spyLoadMore = vi.spyOn(productStore, 'loadMore').mockResolvedValue()
      productStore.$patch({ hasMore: true, isLoadingMore: false })

      const mockTarget = {
        scrollTop: 100,
        scrollHeight: 1000,
        clientHeight: 100,
      }

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      browsing.handleProductScroll({ target: mockTarget } as unknown as Event)

      expect(spyLoadMore).not.toHaveBeenCalled()
    })

    it('does not load more when no customer', () => {
      selectedCustomer.value = null
      const spyLoadMore = vi.spyOn(productStore, 'loadMore').mockResolvedValue()
      productStore.$patch({ hasMore: true, isLoadingMore: false })

      const mockTarget = {
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      browsing.handleProductScroll({ target: mockTarget } as unknown as Event)

      expect(spyLoadMore).not.toHaveBeenCalled()
    })

    it('does not load more when hasMore is false', () => {
      const spyLoadMore = vi.spyOn(productStore, 'loadMore').mockResolvedValue()
      productStore.$patch({ hasMore: false, isLoadingMore: false })

      const mockTarget = {
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      browsing.handleProductScroll({ target: mockTarget } as unknown as Event)

      expect(spyLoadMore).not.toHaveBeenCalled()
    })

    it('does not load more when already loading', () => {
      const spyLoadMore = vi.spyOn(productStore, 'loadMore').mockResolvedValue()
      productStore.$patch({ hasMore: true, isLoadingMore: true })

      const mockTarget = {
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0)
        return 0
      })

      browsing.handleProductScroll({ target: mockTarget } as unknown as Event)

      expect(spyLoadMore).not.toHaveBeenCalled()
    })
  })

  describe('handleSearchFocus', () => {
    it('selects input text on focus', () => {
      const mockSelect = vi.fn()
      const mockAddEventListener = vi.fn()
      const mockTarget = {
        select: mockSelect,
        addEventListener: mockAddEventListener,
      } as unknown as HTMLInputElement

      browsing.handleSearchFocus({ target: mockTarget } as unknown as FocusEvent)

      expect(mockSelect).toHaveBeenCalled()
      expect(mockAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function), { once: true })
    })
  })

  describe('handleCategoryWheel', () => {
    it('converts vertical scroll to horizontal', () => {
      const mockTarget = { scrollLeft: 0 }
      const event = {
        deltaY: 50,
        currentTarget: mockTarget,
      } as unknown as WheelEvent

      browsing.handleCategoryWheel(event)

      expect(mockTarget.scrollLeft).toBe(50)
    })
  })

  describe('onUnmounted cleanup', () => {
    it('clears search debounce timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const TestComponent = defineComponent({
        setup() {
          const customer = ref<Customer | null>(makeCustomer())
          const b = useProductBrowsing(customer)
          // Trigger a debounced search so a timeout is scheduled
          b.searchQuery.value = 'cleanup-test'
          b.handleSearchInput()
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
