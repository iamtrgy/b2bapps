import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOfflineStore } from './offline'
import type { Product } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

// Mock db module
const mockInitDB = vi.fn()
const mockDeleteDatabase = vi.fn()
const mockCacheProducts = vi.fn()
const mockGetCachedProducts = vi.fn()
const mockGetProductCountByIndex = vi.fn()
const mockCacheCustomers = vi.fn()
const mockGetCachedCustomers = vi.fn()
const mockGetCustomerCount = vi.fn()
const mockCacheCategories = vi.fn()
const mockGetCachedCategories = vi.fn()
const mockSavePendingOrder = vi.fn()
const mockGetPendingOrders = vi.fn()
const mockGetPendingOrderCount = vi.fn()
const mockDeletePendingOrder = vi.fn()
const mockUpdatePendingOrder = vi.fn()
const mockIsCacheStale = vi.fn()
const mockClearAllCache = vi.fn()

vi.mock('@/services/db', () => ({
  initDB: (...args: unknown[]) => mockInitDB(...args),
  deleteDatabase: (...args: unknown[]) => mockDeleteDatabase(...args),
  cacheProducts: (...args: unknown[]) => mockCacheProducts(...args),
  getCachedProducts: (...args: unknown[]) => mockGetCachedProducts(...args),
  getProductCountByIndex: (...args: unknown[]) => mockGetProductCountByIndex(...args),
  cacheCustomers: (...args: unknown[]) => mockCacheCustomers(...args),
  getCachedCustomers: (...args: unknown[]) => mockGetCachedCustomers(...args),
  getCustomerCount: (...args: unknown[]) => mockGetCustomerCount(...args),
  cacheCategories: (...args: unknown[]) => mockCacheCategories(...args),
  getCachedCategories: (...args: unknown[]) => mockGetCachedCategories(...args),
  savePendingOrder: (...args: unknown[]) => mockSavePendingOrder(...args),
  getPendingOrders: (...args: unknown[]) => mockGetPendingOrders(...args),
  getPendingOrderCount: (...args: unknown[]) => mockGetPendingOrderCount(...args),
  deletePendingOrder: (...args: unknown[]) => mockDeletePendingOrder(...args),
  updatePendingOrder: (...args: unknown[]) => mockUpdatePendingOrder(...args),
  isCacheStale: (...args: unknown[]) => mockIsCacheStale(...args),
  clearAllCache: (...args: unknown[]) => mockClearAllCache(...args),
}))

const mockOrderCreate = vi.fn()
const mockOrderList = vi.fn()
const mockProductGetAll = vi.fn()
const mockCustomerList = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '', headers: { common: {} } } },
  orderApi: {
    create: (...args: unknown[]) => mockOrderCreate(...args),
    list: (...args: unknown[]) => mockOrderList(...args),
  },
  productApi: {
    getAll: (...args: unknown[]) => mockProductGetAll(...args),
  },
  customerApi: {
    list: (...args: unknown[]) => mockCustomerList(...args),
  },
  authApi: {},
  categoryApi: {},
  promotionApi: {},
}))

function makeProduct(id: number): Product {
  return {
    id, name: `Product ${id}`, sku: `SKU-${id}`, barcode: null, barcode_box: null,
    image_url: null, base_price: 10, price_list_price: 10, price_list_discount: 0,
    price_list_discount_percent: 0, promotion_discount: 0, promotion_discount_percent: 0,
    customer_price: 10, total_discount: 0, total_discount_percent: 0, pricing_source: 'base',
    promotion_id: null, promotion_name: null, promotion_type: null, promotion_value: null,
    pieces_per_box: 12, piece_price: 10, box_price: 120, allow_broken_case: false,
    broken_case_discount: 0, broken_case_piece_price: 10,
    vat_rate: { id: 1, rate: 18 }, stock_quantity: 100,
    availability_status: 'in_stock' as const, can_purchase: true,
    allow_backorder: false, is_preorder: false,
    boxes_per_case: 1, moq_quantity: 1, moq_unit: 'piece' as const,
  }
}

const mockLocalStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value },
  removeItem: (key: string) => { delete mockLocalStorage[key] },
})

describe('useOfflineStore', () => {
  let store: ReturnType<typeof useOfflineStore>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setActivePinia(createPinia())
    store = useOfflineStore()
    for (const key in mockLocalStorage) delete mockLocalStorage[key]

    // Default: db operations resolve
    mockCacheProducts.mockResolvedValue(undefined)
    mockCacheCustomers.mockResolvedValue(undefined)
  })

  afterEach(() => {
    store.cleanup()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(store.isOnline).toBe(true)
      expect(store.isInitialized).toBe(false)
      expect(store.pendingOrderCount).toBe(0)
      expect(store.isSyncing).toBe(false)
      expect(store.syncError).toBeNull()
      expect(store.isDownloading).toBe(false)
      expect(store.hasUnsyncedOrders).toBe(false)
    })
  })

  describe('initialize', () => {
    function makeMockDB(containsOrders = true) {
      const names = ['products', 'customers', 'categories', 'pending_orders', 'sync_meta']
      if (containsOrders) names.push('orders')
      return {
        objectStoreNames: {
          contains: (name: string) => names.includes(name),
          length: names.length,
        },
      }
    }

    it('initializes database and checks network', async () => {
      mockInitDB.mockResolvedValue(makeMockDB())
      mockGetPendingOrderCount.mockResolvedValue(0)

      await store.initialize()

      expect(mockInitDB).toHaveBeenCalled()
      expect(store.isInitialized).toBe(true)
    })

    it('does nothing on second call', async () => {
      mockInitDB.mockResolvedValue(makeMockDB())
      mockGetPendingOrderCount.mockResolvedValue(0)

      await store.initialize()
      vi.clearAllMocks()
      await store.initialize()

      // initDB should not be called again since isInitialized is true
      expect(mockInitDB).not.toHaveBeenCalled()
    })

    it('resets database if orders store is missing', async () => {
      mockInitDB.mockResolvedValueOnce(makeMockDB(false))
      mockDeleteDatabase.mockResolvedValue(undefined)
      mockInitDB.mockResolvedValueOnce(makeMockDB(true))
      mockGetPendingOrderCount.mockResolvedValue(0)

      await store.initialize()

      expect(mockDeleteDatabase).toHaveBeenCalled()
    })

    it('updates pending order count', async () => {
      mockInitDB.mockResolvedValue(makeMockDB())
      mockGetPendingOrderCount.mockResolvedValue(3)

      await store.initialize()

      expect(store.pendingOrderCount).toBe(3)
    })
  })

  describe('cacheProductsForCustomer', () => {
    it('maps products to cached format and stores them', async () => {
      const products = [makeProduct(1)]
      mockCacheProducts.mockResolvedValue(undefined)

      await store.cacheProductsForCustomer(products, 5)

      expect(mockCacheProducts).toHaveBeenCalledTimes(1)
      const cachedProducts = mockCacheProducts.mock.calls[0][0]
      expect(cachedProducts[0].id).toBe(1)
      expect(cachedProducts[0].customer_id).toBe(5)
    })

    it('handles caching error gracefully', async () => {
      mockCacheProducts.mockRejectedValue(new Error('DB error'))

      // Should not throw
      await store.cacheProductsForCustomer([makeProduct(1)], 1)
    })
  })

  describe('getOfflineProducts', () => {
    it('returns cached products', async () => {
      const cached = [{ id: 1, name: 'Cached', customer_id: 0 }]
      mockGetCachedProducts.mockResolvedValue(cached)

      const result = await store.getOfflineProducts(0)

      expect(result).toEqual(cached)
    })

    it('returns empty array on error', async () => {
      mockGetCachedProducts.mockRejectedValue(new Error('DB error'))

      const result = await store.getOfflineProducts(0)

      expect(result).toEqual([])
    })
  })

  describe('downloadAllProducts', () => {
    it('downloads all pages of products', async () => {
      mockProductGetAll
        .mockResolvedValueOnce({ products: [makeProduct(1), makeProduct(2)], hasMore: true, total: 4 })
        .mockResolvedValueOnce({ products: [makeProduct(3), makeProduct(4)], hasMore: false, total: 4 })

      const result = await store.downloadAllProducts(1, 0)

      expect(result.success).toBe(true)
      expect(result.count).toBe(4)
      expect(store.cachedProductCount).toBe(4)
      expect(mockCacheProducts).toHaveBeenCalled()
    })

    it('returns failure when offline', async () => {
      store.$patch({ isOnline: false })

      const result = await store.downloadAllProducts(1)

      expect(result).toEqual({ success: false, count: 0 })
    })

    it('returns failure when already downloading', async () => {
      store.$patch({ isDownloading: true })

      const result = await store.downloadAllProducts(1)

      expect(result).toEqual({ success: false, count: 0 })
    })

    it('resets downloading state on error', async () => {
      mockProductGetAll.mockRejectedValue(new Error('Network'))

      const result = await store.downloadAllProducts(1)

      expect(result.success).toBe(false)
      expect(store.isDownloading).toBe(false)
    })
  })

  describe('downloadAllCustomers', () => {
    it('downloads all pages of customers', async () => {
      mockCustomerList
        .mockResolvedValueOnce({ data: [{ id: 1, company_name: 'C1' }], meta: { current_page: 1, last_page: 2 } })
        .mockResolvedValueOnce({ data: [{ id: 2, company_name: 'C2' }], meta: { current_page: 2, last_page: 2 } })

      const result = await store.downloadAllCustomers()

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
      expect(mockCacheCustomers).toHaveBeenCalled()
    })

    it('returns failure when offline', async () => {
      store.$patch({ isOnline: false })

      const result = await store.downloadAllCustomers()

      expect(result).toEqual({ success: false, count: 0 })
    })

    it('breaks when API returns invalid response', async () => {
      mockCustomerList.mockResolvedValue({ data: null, meta: null })

      const result = await store.downloadAllCustomers()

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
      expect(store.isDownloading).toBe(false)
    })

    it('handles API error gracefully', async () => {
      mockCustomerList.mockRejectedValue(new Error('Network failure'))

      const result = await store.downloadAllCustomers()

      expect(result).toEqual({ success: false, count: 0 })
      expect(store.isDownloading).toBe(false)
    })
  })

  describe('getCachedProductCount', () => {
    it('returns count from IndexedDB', async () => {
      mockGetProductCountByIndex.mockResolvedValue(42)

      const count = await store.getCachedProductCount(0)

      expect(count).toBe(42)
      expect(store.cachedProductCount).toBe(42)
    })

    it('returns 0 on error', async () => {
      mockGetProductCountByIndex.mockRejectedValue(new Error('DB'))

      const count = await store.getCachedProductCount()

      expect(count).toBe(0)
    })
  })

  describe('getCachedCustomerCount', () => {
    it('returns count from IndexedDB', async () => {
      mockGetCustomerCount.mockResolvedValue(15)

      const count = await store.getCachedCustomerCount()

      expect(count).toBe(15)
      expect(store.cachedCustomerCount).toBe(15)
    })

    it('returns 0 on error', async () => {
      mockGetCustomerCount.mockRejectedValue(new Error('DB'))

      const count = await store.getCachedCustomerCount()

      expect(count).toBe(0)
    })
  })

  describe('saveOrderOffline', () => {
    it('saves order and updates count', async () => {
      mockSavePendingOrder.mockResolvedValue(1)
      mockGetPendingOrderCount.mockResolvedValue(1)

      const localId = await store.saveOrderOffline({
        customerId: 1,
        customerName: 'Test Co',
        items: [{
          product_id: 1, name: 'P1', quantity: 2, price: 10,
          base_price: 10, unit_type: 'box', pieces_per_box: 12, vat_rate: 18,
        }],
        subtotal: 20,
        vatTotal: 3.6,
        total: 23.6,
        notes: 'test note',
      })

      expect(localId).toBe(1)
      expect(store.pendingOrderCount).toBe(1)
      expect(mockSavePendingOrder).toHaveBeenCalled()
    })
  })

  describe('getAllPendingOrders', () => {
    it('returns all pending orders from db', async () => {
      const orders = [{ local_id: 1, customer_id: 1 }, { local_id: 2, customer_id: 2 }]
      mockGetPendingOrders.mockResolvedValue(orders)

      const result = await store.getAllPendingOrders()

      expect(result).toEqual(orders)
    })
  })

  describe('syncPendingOrders', () => {
    it('syncs pending orders to server', async () => {
      const orders = [
        { local_id: 1, customer_id: 1, sync_status: 'pending', items: [{ product_id: 1, quantity: 1, price: 10, base_price: 10, unit_type: 'box', pieces_per_box: 12, vat_rate: 18 }], notes: '', retry_count: 0 },
      ]
      mockGetPendingOrders.mockResolvedValue(orders)
      mockUpdatePendingOrder.mockResolvedValue(undefined)
      mockOrderCreate.mockResolvedValue({ success: true })
      mockDeletePendingOrder.mockResolvedValue(undefined)
      mockGetPendingOrderCount.mockResolvedValue(0)

      const result = await store.syncPendingOrders()

      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('marks failed orders with error', async () => {
      const orders = [
        { local_id: 1, customer_id: 1, sync_status: 'pending', items: [], notes: '', retry_count: 0 },
      ]
      mockGetPendingOrders.mockResolvedValue(orders)
      mockUpdatePendingOrder.mockResolvedValue(undefined)
      mockOrderCreate.mockRejectedValue(new Error('Server error'))
      mockGetPendingOrderCount.mockResolvedValue(1)

      const result = await store.syncPendingOrders()

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      expect(store.syncError).toBeTruthy()
    })

    it('does nothing when already syncing', async () => {
      store.isSyncing = true

      const result = await store.syncPendingOrders()

      expect(result).toEqual({ success: 0, failed: 0 })
      expect(mockGetPendingOrders).not.toHaveBeenCalled()
    })

    it('does nothing when offline', async () => {
      store.isOnline = false

      const result = await store.syncPendingOrders()

      expect(result).toEqual({ success: 0, failed: 0 })
    })

    it('skips already syncing orders', async () => {
      const orders = [
        { local_id: 1, customer_id: 1, sync_status: 'syncing', items: [], notes: '', retry_count: 0 },
      ]
      mockGetPendingOrders.mockResolvedValue(orders)
      mockGetPendingOrderCount.mockResolvedValue(0)

      const result = await store.syncPendingOrders()

      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
      expect(mockOrderCreate).not.toHaveBeenCalled()
    })

    it('marks order as failed when API returns success:false', async () => {
      const orders = [
        { local_id: 1, customer_id: 1, sync_status: 'pending', items: [{ product_id: 1, quantity: 1, price: 10, base_price: 10, unit_type: 'box', pieces_per_box: 12, vat_rate: 18 }], notes: '', retry_count: 0 },
      ]
      mockGetPendingOrders.mockResolvedValue(orders)
      mockUpdatePendingOrder.mockResolvedValue(undefined)
      mockOrderCreate.mockResolvedValue({ success: false, message: 'Validation failed' })
      mockGetPendingOrderCount.mockResolvedValue(1)

      const result = await store.syncPendingOrders()

      expect(result.success).toBe(0)
      expect(result.failed).toBe(1)
      // Verify the order was marked as failed (second call to updatePendingOrder, after the syncing mark)
      const failedUpdate = mockUpdatePendingOrder.mock.calls[1][0]
      expect(failedUpdate.sync_status).toBe('failed')
      expect(failedUpdate.retry_count).toBe(1)
    })
  })

  describe('cacheCustomerList', () => {
    it('maps customers to cached format', async () => {
      mockCacheCustomers.mockResolvedValue(undefined)

      await store.cacheCustomerList([
        { id: 1, company_name: 'Test', contact_name: 'J', contact_email: 'e', contact_phone: 'p', customer_tier: 'gold' },
      ])

      expect(mockCacheCustomers).toHaveBeenCalledTimes(1)
      const cached = mockCacheCustomers.mock.calls[0][0]
      expect(cached[0].company_name).toBe('Test')
    })

    it('handles caching error gracefully', async () => {
      mockCacheCustomers.mockRejectedValue(new Error('DB'))

      await store.cacheCustomerList([{ id: 1, company_name: 'Test' }])
      // should not throw
    })
  })

  describe('getOfflineCustomers', () => {
    it('returns cached customers', async () => {
      const customers = [{ id: 1, company_name: 'Cached Co' }]
      mockGetCachedCustomers.mockResolvedValue(customers)

      const result = await store.getOfflineCustomers()

      expect(result).toEqual(customers)
    })

    it('returns empty array on error', async () => {
      mockGetCachedCustomers.mockRejectedValue(new Error('DB'))

      const result = await store.getOfflineCustomers()

      expect(result).toEqual([])
    })
  })

  describe('isDataStale', () => {
    it('delegates to isCacheStale', async () => {
      mockIsCacheStale.mockResolvedValue(true)

      const result = await store.isDataStale('products_1')

      expect(result).toBe(true)
      expect(mockIsCacheStale).toHaveBeenCalledWith('products_1', undefined)
    })
  })

  describe('clearCache', () => {
    it('delegates to clearAllCache', async () => {
      mockClearAllCache.mockResolvedValue(undefined)

      await store.clearCache()

      expect(mockClearAllCache).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('removes event listeners and clears interval', async () => {
      const mockDB = { objectStoreNames: { contains: () => true } }
      mockInitDB.mockResolvedValue(mockDB)
      mockGetPendingOrderCount.mockResolvedValue(0)

      await store.initialize()
      const removeEventSpy = vi.spyOn(window, 'removeEventListener')

      store.cleanup()

      expect(removeEventSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventSpy).toHaveBeenCalledWith('offline', expect.any(Function))
      removeEventSpy.mockRestore()
    })
  })

  describe('hasUnsyncedOrders (computed)', () => {
    it('returns true when pendingOrderCount > 0', () => {
      store.pendingOrderCount = 3
      expect(store.hasUnsyncedOrders).toBe(true)
    })

    it('returns false when pendingOrderCount is 0', () => {
      store.pendingOrderCount = 0
      expect(store.hasUnsyncedOrders).toBe(false)
    })
  })

  describe('cacheCategoryList', () => {
    it('maps categories to cached format', async () => {
      mockCacheCategories.mockResolvedValue(undefined)

      await store.cacheCategoryList([
        { id: 1, name: 'Cat A', parent_id: null, product_count: 5, children: [] },
      ])

      expect(mockCacheCategories).toHaveBeenCalledTimes(1)
      const cached = mockCacheCategories.mock.calls[0][0]
      expect(cached[0].name).toBe('Cat A')
      expect(cached[0].cached_at).toBeDefined()
    })

    it('handles caching error gracefully', async () => {
      mockCacheCategories.mockRejectedValue(new Error('DB'))

      await store.cacheCategoryList([{ id: 1, name: 'Cat' }])
      // should not throw
    })
  })

  describe('getOfflineCategories', () => {
    it('returns cached categories', async () => {
      const categories = [{ id: 1, name: 'Cached Cat' }]
      mockGetCachedCategories.mockResolvedValue(categories)

      const result = await store.getOfflineCategories()

      expect(result).toEqual(categories)
    })

    it('returns empty array on error', async () => {
      mockGetCachedCategories.mockRejectedValue(new Error('DB'))

      const result = await store.getOfflineCategories()

      expect(result).toEqual([])
    })
  })

  describe('downloadRecentOrders', () => {
    /** Create a mock IDB database that uses property setters for async callbacks
     * to work correctly with vi.useFakeTimers() */
    function makeMockDBWithOrders(containsOrders = true) {
      const storeNames = ['products', 'customers', 'categories', 'pending_orders', 'sync_meta']
      if (containsOrders) storeNames.push('orders')

      function makeRequest(result: any) {
        const req: any = { result }
        Object.defineProperty(req, 'onsuccess', {
          set(fn: any) { Promise.resolve().then(() => fn?.()) },
          get() { return null },
        })
        Object.defineProperty(req, 'onerror', {
          set() {},
          get() { return null },
        })
        return req
      }

      const mockStore = {
        clear: vi.fn(),
        put: vi.fn(),
        getAll: vi.fn(() => makeRequest([])),
        count: vi.fn(() => makeRequest(0)),
      }

      function createTx() {
        const tx: any = {
          objectStore: () => mockStore,
          error: null,
        }
        Object.defineProperty(tx, 'oncomplete', {
          set(fn: any) { Promise.resolve().then(() => fn?.()) },
          get() { return null },
        })
        Object.defineProperty(tx, 'onerror', {
          set() {},
          get() { return null },
        })
        return tx
      }

      return {
        objectStoreNames: {
          contains: (name: string) => storeNames.includes(name),
          length: storeNames.length,
        },
        transaction: () => createTx(),
        _mockStore: mockStore,
      }
    }

    it('downloads single page of orders', async () => {
      const mockDB = makeMockDBWithOrders(true)
      mockInitDB.mockResolvedValue(mockDB)

      mockOrderList.mockResolvedValue({
        data: [{ id: 1, order_number: 'ORD-1' }],
        meta: { current_page: 1, last_page: 1 },
      })

      const result = await store.downloadRecentOrders()

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(store.isDownloading).toBe(false)
    })

    it('downloads multiple pages of orders', async () => {
      const mockDB = makeMockDBWithOrders(true)
      mockInitDB.mockResolvedValue(mockDB)

      mockOrderList
        .mockResolvedValueOnce({
          data: [{ id: 1, order_number: 'ORD-1' }],
          meta: { current_page: 1, last_page: 2 },
        })
        .mockResolvedValueOnce({
          data: [{ id: 2, order_number: 'ORD-2' }],
          meta: { current_page: 2, last_page: 2 },
        })

      const result = await store.downloadRecentOrders()

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
    })

    it('returns early when offline', async () => {
      store.$patch({ isOnline: false })

      const result = await store.downloadRecentOrders()

      expect(result).toEqual({ success: false, count: 0 })
      expect(mockOrderList).not.toHaveBeenCalled()
    })

    it('returns early when already downloading', async () => {
      store.$patch({ isDownloading: true })

      const result = await store.downloadRecentOrders()

      expect(result).toEqual({ success: false, count: 0 })
      expect(mockOrderList).not.toHaveBeenCalled()
    })

    it('returns needsReset when orders store missing', async () => {
      const mockDB = makeMockDBWithOrders(false)
      mockInitDB.mockResolvedValue(mockDB)

      const result = await store.downloadRecentOrders()

      expect(result.success).toBe(false)
      expect(result.needsReset).toBe(true)
    })

    it('returns failure on API error', async () => {
      const mockDB = makeMockDBWithOrders(true)
      mockInitDB.mockResolvedValue(mockDB)
      mockOrderList.mockRejectedValue(new Error('Server error'))

      const result = await store.downloadRecentOrders()

      expect(result.success).toBe(false)
      expect(store.isDownloading).toBe(false)
    })

    it('breaks loop when API returns invalid response', async () => {
      const mockDB = makeMockDBWithOrders(true)
      mockInitDB.mockResolvedValue(mockDB)

      mockOrderList.mockResolvedValue({ data: null, meta: null })

      const result = await store.downloadRecentOrders()

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
      expect(store.isDownloading).toBe(false)
    })

    it('handles cacheOrders when orders store is missing', async () => {
      // First call to initDB (for the pre-check in downloadRecentOrders) returns DB with orders
      // Second call to initDB (inside cacheOrders) returns DB without orders store
      const mockDBWithOrders = makeMockDBWithOrders(true)
      const mockDBWithoutOrders = makeMockDBWithOrders(false)

      mockInitDB
        .mockResolvedValueOnce(mockDBWithOrders)  // pre-check: has orders store
        .mockResolvedValueOnce(mockDBWithoutOrders) // cacheOrders: missing orders store

      mockOrderList.mockResolvedValue({
        data: [{ id: 1, order_number: 'ORD-1' }],
        meta: { current_page: 1, last_page: 1 },
      })

      const result = await store.downloadRecentOrders()

      // cacheOrders returns early, but downloadRecentOrders still succeeds
      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(store.isDownloading).toBe(false)
    })
  })

  describe('getOfflineOrders', () => {
    function makeMockDBForGetAll(orders: any[], containsOrders = true) {
      const storeNames = ['products', 'customers', 'categories', 'pending_orders', 'sync_meta']
      if (containsOrders) storeNames.push('orders')

      const mockStore = {
        getAll: vi.fn(() => {
          const req: any = { result: orders }
          Object.defineProperty(req, 'onsuccess', {
            set(fn: any) { Promise.resolve().then(() => fn?.()) },
            get() { return null },
          })
          Object.defineProperty(req, 'onerror', {
            set() {},
            get() { return null },
          })
          return req
        }),
      }

      function createTx() {
        const tx: any = { objectStore: () => mockStore, error: null }
        Object.defineProperty(tx, 'oncomplete', { set() {}, get() { return null } })
        Object.defineProperty(tx, 'onerror', { set() {}, get() { return null } })
        return tx
      }

      return {
        objectStoreNames: { contains: (name: string) => storeNames.includes(name) },
        transaction: () => createTx(),
      }
    }

    it('returns cached orders', async () => {
      const mockDB = makeMockDBForGetAll([{ id: 1, order_number: 'ORD-1' }])
      mockInitDB.mockResolvedValue(mockDB)

      const result = await store.getOfflineOrders()

      expect(result).toHaveLength(1)
      expect(result[0].order_number).toBe('ORD-1')
    })

    it('returns empty array when orders store missing', async () => {
      const mockDB = makeMockDBForGetAll([], false)
      mockInitDB.mockResolvedValue(mockDB)

      const result = await store.getOfflineOrders()

      expect(result).toEqual([])
    })

    it('returns empty array on error', async () => {
      mockInitDB.mockRejectedValue(new Error('DB error'))

      const result = await store.getOfflineOrders()

      expect(result).toEqual([])
    })
  })

  describe('getCachedOrderCount', () => {
    function makeMockDBForCount(count: number, containsOrders = true) {
      const storeNames = ['products', 'customers', 'categories', 'pending_orders', 'sync_meta']
      if (containsOrders) storeNames.push('orders')

      const mockStore = {
        count: vi.fn(() => {
          const req: any = { result: count }
          Object.defineProperty(req, 'onsuccess', {
            set(fn: any) { Promise.resolve().then(() => fn?.()) },
            get() { return null },
          })
          Object.defineProperty(req, 'onerror', {
            set() {},
            get() { return null },
          })
          return req
        }),
      }

      function createTx() {
        const tx: any = { objectStore: () => mockStore, error: null }
        Object.defineProperty(tx, 'oncomplete', { set() {}, get() { return null } })
        Object.defineProperty(tx, 'onerror', { set() {}, get() { return null } })
        return tx
      }

      return {
        objectStoreNames: { contains: (name: string) => storeNames.includes(name) },
        transaction: () => createTx(),
      }
    }

    it('returns count of cached orders', async () => {
      const mockDB = makeMockDBForCount(15)
      mockInitDB.mockResolvedValue(mockDB)

      const count = await store.getCachedOrderCount()

      expect(count).toBe(15)
      expect(store.cachedOrderCount).toBe(15)
    })

    it('returns 0 when orders store missing', async () => {
      const mockDB = makeMockDBForCount(0, false)
      mockInitDB.mockResolvedValue(mockDB)

      const count = await store.getCachedOrderCount()

      expect(count).toBe(0)
      expect(store.cachedOrderCount).toBe(0)
    })

    it('returns 0 on error', async () => {
      mockInitDB.mockRejectedValue(new Error('DB error'))

      const count = await store.getCachedOrderCount()

      expect(count).toBe(0)
    })
  })
})
