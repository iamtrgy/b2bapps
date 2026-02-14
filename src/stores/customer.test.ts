import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCustomerStore } from './customer'
import type { Customer } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockCustomerList = vi.fn()
const mockCustomerGet = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '', headers: { common: {} } } },
  customerApi: {
    list: (...args: unknown[]) => mockCustomerList(...args),
    get: (...args: unknown[]) => mockCustomerGet(...args),
  },
  authApi: {},
  productApi: {},
  orderApi: {},
  categoryApi: {},
  promotionApi: {},
}))

const mockGetOfflineCustomers = vi.fn()
const mockCacheCustomerList = vi.fn()

const mockOfflineStoreState = { isOnline: true }

vi.mock('@/stores/offline', () => ({
  useOfflineStore: () => ({
    get isOnline() { return mockOfflineStoreState.isOnline },
    getOfflineCustomers: mockGetOfflineCustomers,
    cacheCustomerList: mockCacheCustomerList,
  }),
}))

function makeCustomer(id: number): Customer {
  return {
    id,
    company_name: `Company ${id}`,
    contact_name: `Contact ${id}`,
    contact_email: `c${id}@test.com`,
    contact_phone: '555',
    customer_tier: 'gold',
  }
}

function makePaginatedResponse(customers: Customer[], page = 1, lastPage = 1) {
  return {
    data: customers,
    meta: { current_page: page, last_page: lastPage, per_page: 20, total: customers.length * lastPage },
  }
}

describe('useCustomerStore', () => {
  let store: ReturnType<typeof useCustomerStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOfflineStoreState.isOnline = true
    setActivePinia(createPinia())
    store = useCustomerStore()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(store.customers).toEqual([])
      expect(store.selectedCustomer).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.searchQuery).toBe('')
      expect(store.currentPage).toBe(1)
      expect(store.lastPage).toBe(1)
      expect(store.total).toBe(0)
      expect(store.isOfflineMode).toBe(false)
    })

    it('hasMore is false initially', () => {
      expect(store.hasMore).toBe(false)
    })
  })

  describe('fetchCustomers', () => {
    it('loads customers from API (page 1)', async () => {
      const customers = [makeCustomer(1), makeCustomer(2)]
      mockCustomerList.mockResolvedValue(makePaginatedResponse(customers))

      await store.fetchCustomers()

      expect(mockCustomerList).toHaveBeenCalledWith(1, undefined)
      expect(store.customers).toEqual(customers)
      expect(store.isLoading).toBe(false)
      expect(store.isOfflineMode).toBe(false)
    })

    it('caches customers on page 1 without search', async () => {
      const customers = [makeCustomer(1)]
      mockCustomerList.mockResolvedValue(makePaginatedResponse(customers))

      await store.fetchCustomers(1)

      expect(mockCacheCustomerList).toHaveBeenCalledWith(customers)
    })

    it('does not cache when searching', async () => {
      mockCustomerList.mockResolvedValue(makePaginatedResponse([makeCustomer(1)]))

      await store.fetchCustomers(1, 'test')

      expect(mockCacheCustomerList).not.toHaveBeenCalled()
    })

    it('appends customers on subsequent pages', async () => {
      store.customers = [makeCustomer(1)]
      mockCustomerList.mockResolvedValue(makePaginatedResponse([makeCustomer(2)], 2, 3))

      await store.fetchCustomers(2)

      expect(store.customers).toHaveLength(2)
      expect(store.currentPage).toBe(2)
    })

    it('updates pagination metadata', async () => {
      mockCustomerList.mockResolvedValue({
        data: [makeCustomer(1)],
        meta: { current_page: 1, last_page: 3, per_page: 20, total: 60 },
      })

      await store.fetchCustomers()

      expect(store.currentPage).toBe(1)
      expect(store.lastPage).toBe(3)
      expect(store.total).toBe(60)
      expect(store.hasMore).toBe(true)
    })

    it('falls back to offline on API error', async () => {
      const offlineCustomers = [{ id: 1, company_name: 'Offline Co', contact_name: 'A', contact_email: null, contact_phone: null, customer_tier: 'bronze', cached_at: Date.now() }]
      mockCustomerList.mockRejectedValue(new Error('Network'))
      mockGetOfflineCustomers.mockResolvedValue(offlineCustomers)

      await store.fetchCustomers()

      expect(store.isOfflineMode).toBe(true)
      expect(store.customers.length).toBeGreaterThan(0)
    })

    it('clears customers when offline fallback also fails', async () => {
      mockCustomerList.mockRejectedValue(new Error('Network'))
      mockGetOfflineCustomers.mockRejectedValue(new Error('DB error'))

      await store.fetchCustomers()

      expect(store.customers).toEqual([])
    })

    it('uses offline customers directly when not online', async () => {
      mockOfflineStoreState.isOnline = false
      const cached = [{ id: 1, company_name: 'Offline Co', contact_name: null, contact_email: null, contact_phone: null, customer_tier: 'bronze', cached_at: Date.now() }]
      mockGetOfflineCustomers.mockResolvedValue(cached)

      await store.fetchCustomers()

      expect(mockCustomerList).not.toHaveBeenCalled()
      expect(store.isOfflineMode).toBe(true)
      expect(store.customers).toHaveLength(1)
      expect(store.currentPage).toBe(1)
      expect(store.lastPage).toBe(1)
    })

    it('filters offline customers by search when not online', async () => {
      mockOfflineStoreState.isOnline = false
      const cached = [
        { id: 1, company_name: 'Alpha Co', contact_name: 'John', contact_email: 'a@test.com', contact_phone: null, customer_tier: 'gold', cached_at: Date.now() },
        { id: 2, company_name: 'Beta Inc', contact_name: 'Jane', contact_email: 'b@test.com', contact_phone: null, customer_tier: 'silver', cached_at: Date.now() },
      ]
      mockGetOfflineCustomers.mockResolvedValue(cached)

      await store.fetchCustomers(1, 'alpha')

      expect(store.customers).toHaveLength(1)
      expect(store.customers[0].company_name).toBe('Alpha Co')
    })
  })

  describe('searchCustomers', () => {
    it('sets searchQuery and fetches page 1', async () => {
      mockCustomerList.mockResolvedValue(makePaginatedResponse([makeCustomer(1)]))

      await store.searchCustomers('test query')

      expect(store.searchQuery).toBe('test query')
      expect(mockCustomerList).toHaveBeenCalledWith(1, 'test query')
    })
  })

  describe('loadMore', () => {
    it('fetches next page when hasMore', async () => {
      store.$patch({ currentPage: 1, lastPage: 3, isLoading: false })
      mockCustomerList.mockResolvedValue(makePaginatedResponse([makeCustomer(3)], 2, 3))

      await store.loadMore()

      expect(mockCustomerList).toHaveBeenCalledWith(2, undefined)
    })

    it('does nothing when no more pages', async () => {
      store.$patch({ currentPage: 1, lastPage: 1 })

      await store.loadMore()

      expect(mockCustomerList).not.toHaveBeenCalled()
    })

    it('does nothing when already loading', async () => {
      store.$patch({ currentPage: 1, lastPage: 3, isLoading: true })

      await store.loadMore()

      expect(mockCustomerList).not.toHaveBeenCalled()
    })

    it('passes current searchQuery to fetchCustomers', async () => {
      store.$patch({ currentPage: 1, lastPage: 3, isLoading: false, searchQuery: 'test' })
      mockCustomerList.mockResolvedValue(makePaginatedResponse([makeCustomer(3)], 2, 3))

      await store.loadMore()

      expect(mockCustomerList).toHaveBeenCalledWith(2, 'test')
    })
  })

  describe('selectCustomer', () => {
    it('sets selectedCustomer', async () => {
      const customer = makeCustomer(5)
      await store.selectCustomer(customer)
      expect(store.selectedCustomer).toEqual(customer)
    })
  })

  describe('selectCustomerById', () => {
    it('selects from existing list', async () => {
      const customer = makeCustomer(3)
      store.customers = [makeCustomer(1), customer, makeCustomer(5)]

      await store.selectCustomerById(3)

      expect(store.selectedCustomer).toEqual(customer)
      expect(mockCustomerGet).not.toHaveBeenCalled()
    })

    it('fetches from API when not in list', async () => {
      const customer = makeCustomer(99)
      mockCustomerGet.mockResolvedValue(customer)

      await store.selectCustomerById(99)

      expect(mockCustomerGet).toHaveBeenCalledWith(99)
      expect(store.selectedCustomer).toEqual(customer)
    })

    it('throws on API error', async () => {
      mockCustomerGet.mockRejectedValue(new Error('Not found'))

      await expect(store.selectCustomerById(999)).rejects.toThrow('Not found')
    })
  })

  describe('clearSelection', () => {
    it('clears selectedCustomer', () => {
      store.selectedCustomer = makeCustomer(1)
      store.clearSelection()
      expect(store.selectedCustomer).toBeNull()
    })
  })

  describe('cachedToCustomer defaults', () => {
    it('cachedToCustomer defaults customer_tier to bronze when missing', async () => {
      mockOfflineStoreState.isOnline = false
      const cached = [{
        id: 50,
        company_name: 'No Tier Co',
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        customer_tier: '',
        cached_at: Date.now(),
      }]
      mockGetOfflineCustomers.mockResolvedValue(cached)

      await store.fetchCustomers()

      expect(store.customers).toHaveLength(1)
      expect(store.customers[0].customer_tier).toBe('bronze')
    })
  })

  describe('reset', () => {
    it('resets all state', () => {
      store.$patch({
        customers: [makeCustomer(1)],
        selectedCustomer: makeCustomer(1),
        searchQuery: 'test',
        currentPage: 3,
        lastPage: 5,
        total: 100,
        isOfflineMode: true,
      })

      store.reset()

      expect(store.customers).toEqual([])
      expect(store.selectedCustomer).toBeNull()
      expect(store.searchQuery).toBe('')
      expect(store.currentPage).toBe(1)
      expect(store.lastPage).toBe(1)
      expect(store.total).toBe(0)
      expect(store.isOfflineMode).toBe(false)
    })
  })
})
