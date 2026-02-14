import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import {
  initDB,
  resetDBConnection,
  deleteDatabase,
  cacheProducts,
  getCachedProducts,
  getCachedProductsByCategory,
  getProductCountByIndex,
  clearProductCache,
  cacheCustomers,
  getCachedCustomers,
  getCustomerCount,
  clearCustomerCache,
  cacheCategories,
  getCachedCategories,
  clearCategoryCache,
  savePendingOrder,
  getPendingOrders,
  getPendingOrdersByStatus,
  updatePendingOrder,
  deletePendingOrder,
  getPendingOrderCount,
  setSyncMeta,
  getSyncMeta,
  isCacheStale,
  clearAllCache,
  getDatabaseSize,
  type CachedProduct,
  type CachedCustomer,
  type CachedCategory,
  type PendingOrder,
} from './db'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

function makeCachedProduct(id: number, customerId = 1, categoryId: number | null = null): CachedProduct {
  return {
    id,
    customer_id: customerId,
    name: `Product ${id}`,
    sku: `SKU-${id}`,
    barcode: null,
    barcode_box: null,
    image_url: null,
    base_price: 10,
    box_price: 120,
    piece_price: 10,
    broken_case_piece_price: 10,
    total_discount: 0,
    total_discount_percent: 0,
    pieces_per_box: 12,
    allow_broken_case: false,
    vat_rate: { rate: 18 },
    category_id: categoryId,
    availability_status: 'in_stock',
    can_purchase: true,
    allow_backorder: false,
    is_preorder: false,
    cached_at: Date.now(),
  }
}

function makeCachedCustomer(id: number): CachedCustomer {
  return {
    id,
    company_name: `Company ${id}`,
    contact_name: `Contact ${id}`,
    contact_email: `c${id}@test.com`,
    contact_phone: '555',
    customer_tier: 'gold',
    cached_at: Date.now(),
  }
}

function makePendingOrder(overrides: Partial<Omit<PendingOrder, 'local_id'>> = {}): Omit<PendingOrder, 'local_id'> {
  return {
    customer_id: 1,
    customer_name: 'Test Co',
    items: [{
      product_id: 1,
      name: 'Product 1',
      quantity: 2,
      price: 10,
      base_price: 10,
      unit_type: 'box',
      pieces_per_box: 12,
      vat_rate: 18,
    }],
    subtotal: 20,
    vat_total: 3.6,
    total: 23.6,
    notes: '',
    created_at: Date.now(),
    sync_status: 'pending',
    retry_count: 0,
    ...overrides,
  }
}

describe('IndexedDB Service (db.ts)', () => {
  beforeEach(async () => {
    resetDBConnection()
    // Delete and reinitialize for a clean slate
    await deleteDatabase()
    await initDB()
  })

  afterEach(() => {
    resetDBConnection()
  })

  describe('initDB', () => {
    it('initializes and returns a database', async () => {
      resetDBConnection()
      const db = await initDB()
      expect(db).toBeDefined()
      expect(db.objectStoreNames).toContain('products')
      expect(db.objectStoreNames).toContain('customers')
      expect(db.objectStoreNames).toContain('categories')
      expect(db.objectStoreNames).toContain('pending_orders')
      expect(db.objectStoreNames).toContain('orders')
      expect(db.objectStoreNames).toContain('sync_meta')
    })

    it('returns same instance on second call', async () => {
      resetDBConnection()
      const db1 = await initDB()
      const db2 = await initDB()
      expect(db1).toBe(db2)
    })

    it('rejects when indexedDB.open fails (onerror)', async () => {
      resetDBConnection()
      const mockError = new DOMException('Test open error')
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        // Create a minimal mock IDBOpenDBRequest
        const request = {
          onerror: null as ((ev: Event) => void) | null,
          onsuccess: null as ((ev: Event) => void) | null,
          onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
          onblocked: null as ((ev: Event) => void) | null,
          error: mockError,
          result: null,
        } as unknown as IDBOpenDBRequest
        // Trigger onerror asynchronously after initDB sets it up
        queueMicrotask(() => {
          if (request.onerror) request.onerror(new Event('error'))
        })
        return request
      })

      await expect(initDB()).rejects.toBe(mockError)

      vi.restoreAllMocks()
      // Clean up: reset and reinit for subsequent tests
      resetDBConnection()
      await initDB()
    })

    it('handles onblocked event gracefully', async () => {
      resetDBConnection()
      // Create a mock request that fires onblocked then onsuccess
      const realDb = await initDB()
      resetDBConnection()

      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        const request = {
          onerror: null as ((ev: Event) => void) | null,
          onsuccess: null as ((ev: Event) => void) | null,
          onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
          onblocked: null as ((ev: Event) => void) | null,
          error: null,
          result: realDb,
        } as unknown as IDBOpenDBRequest
        // Fire onblocked first, then onsuccess
        queueMicrotask(() => {
          if (request.onblocked) request.onblocked(new Event('blocked') as IDBVersionChangeEvent)
          if (request.onsuccess) request.onsuccess(new Event('success'))
        })
        return request
      })

      const db = await initDB()
      expect(db).toBeDefined()

      vi.restoreAllMocks()
      resetDBConnection()
      await deleteDatabase()
      await initDB()
    })

    it('handles onversionchange by closing the connection', async () => {
      resetDBConnection()
      const db = await initDB()

      // Capture the onversionchange handler that was set during initDB
      // and invoke it directly to simulate another tab upgrading the DB
      if (db.onversionchange) {
        db.onversionchange(new Event('versionchange') as IDBVersionChangeEvent)
      }

      // After onversionchange, the module's internal db ref should be null,
      // so the next initDB should create a new connection
      const db2 = await initDB()
      expect(db2).toBeDefined()
    })
  })

  describe('Products CRUD', () => {
    it('caches and retrieves products for a customer', async () => {
      const products = [makeCachedProduct(1, 5), makeCachedProduct(2, 5)]
      await cacheProducts(products, 5)

      const result = await getCachedProducts(5)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Product 1')
    })

    it('returns empty for uncached customer', async () => {
      const result = await getCachedProducts(999)
      expect(result).toEqual([])
    })

    it('filters by category', async () => {
      await cacheProducts([
        makeCachedProduct(1, 1, 10),
        makeCachedProduct(2, 1, 20),
        makeCachedProduct(3, 1, 10),
      ], 1)

      const result = await getCachedProductsByCategory(1, 10)
      expect(result).toHaveLength(2)
    })

    it('counts products by customer index', async () => {
      await cacheProducts([makeCachedProduct(1, 1), makeCachedProduct(2, 1)], 1)
      await cacheProducts([makeCachedProduct(3, 2)], 2)

      const count1 = await getProductCountByIndex(1)
      const count2 = await getProductCountByIndex(2)
      expect(count1).toBe(2)
      expect(count2).toBe(1)
    })

    it('clears products for specific customer', async () => {
      await cacheProducts([makeCachedProduct(1, 1)], 1)
      await cacheProducts([makeCachedProduct(2, 2)], 2)

      await clearProductCache(1)

      expect(await getCachedProducts(1)).toHaveLength(0)
      expect(await getCachedProducts(2)).toHaveLength(1)
    })

    it('clears all products when no customerId', async () => {
      await cacheProducts([makeCachedProduct(1, 1)], 1)
      await cacheProducts([makeCachedProduct(2, 2)], 2)

      await clearProductCache()

      expect(await getCachedProducts(1)).toHaveLength(0)
      expect(await getCachedProducts(2)).toHaveLength(0)
    })
  })

  describe('Customers CRUD', () => {
    it('caches and retrieves customers', async () => {
      await cacheCustomers([makeCachedCustomer(1), makeCachedCustomer(2)])

      const result = await getCachedCustomers()
      expect(result).toHaveLength(2)
    })

    it('counts customers', async () => {
      await cacheCustomers([makeCachedCustomer(1), makeCachedCustomer(2), makeCachedCustomer(3)])

      const count = await getCustomerCount()
      expect(count).toBe(3)
    })

    it('clears customer cache', async () => {
      await cacheCustomers([makeCachedCustomer(1)])

      await clearCustomerCache()

      const result = await getCachedCustomers()
      expect(result).toHaveLength(0)
    })
  })

  describe('Categories CRUD', () => {
    it('caches and retrieves categories', async () => {
      const categories: CachedCategory[] = [
        { id: 1, name: 'Fruit', parent_id: null, product_count: 10, cached_at: Date.now() },
        { id: 2, name: 'Vegetables', parent_id: null, product_count: 5, cached_at: Date.now() },
      ]
      await cacheCategories(categories)

      const result = await getCachedCategories()
      expect(result).toHaveLength(2)
    })

    it('flattens nested categories', async () => {
      const categories: CachedCategory[] = [
        {
          id: 1, name: 'Parent', parent_id: null, product_count: 10, cached_at: Date.now(),
          children: [
            { id: 2, name: 'Child', parent_id: 1, product_count: 3, cached_at: Date.now() },
          ],
        },
      ]
      await cacheCategories(categories)

      const result = await getCachedCategories()
      expect(result).toHaveLength(2)
      expect(result.find(c => c.id === 2)?.name).toBe('Child')
    })

    it('clears category cache', async () => {
      await cacheCategories([{ id: 1, name: 'Cat', parent_id: null, cached_at: Date.now() }])
      await clearCategoryCache()

      const result = await getCachedCategories()
      expect(result).toHaveLength(0)
    })
  })

  describe('Pending Orders', () => {
    it('saves a pending order and returns local_id', async () => {
      const localId = await savePendingOrder(makePendingOrder())
      expect(typeof localId).toBe('number')
      expect(localId).toBeGreaterThan(0)
    })

    it('retrieves all pending orders', async () => {
      await savePendingOrder(makePendingOrder())
      await savePendingOrder(makePendingOrder({ customer_id: 2, customer_name: 'Other Co' }))

      const orders = await getPendingOrders()
      expect(orders).toHaveLength(2)
    })

    it('retrieves orders by sync status', async () => {
      await savePendingOrder(makePendingOrder({ sync_status: 'pending' }))
      await savePendingOrder(makePendingOrder({ sync_status: 'failed' }))
      await savePendingOrder(makePendingOrder({ sync_status: 'pending' }))

      const pending = await getPendingOrdersByStatus('pending')
      expect(pending).toHaveLength(2)

      const failed = await getPendingOrdersByStatus('failed')
      expect(failed).toHaveLength(1)
    })

    it('updates a pending order', async () => {
      await savePendingOrder(makePendingOrder())

      const orders = await getPendingOrders()
      const order = orders[0]
      await updatePendingOrder({ ...order, sync_status: 'syncing' })

      const updated = await getPendingOrders()
      expect(updated[0].sync_status).toBe('syncing')
    })

    it('deletes a pending order', async () => {
      const localId = await savePendingOrder(makePendingOrder())

      await deletePendingOrder(localId)

      const orders = await getPendingOrders()
      expect(orders).toHaveLength(0)
    })

    it('counts pending and failed orders', async () => {
      await savePendingOrder(makePendingOrder({ sync_status: 'pending' }))
      await savePendingOrder(makePendingOrder({ sync_status: 'failed' }))
      await savePendingOrder(makePendingOrder({ sync_status: 'syncing' }))

      const count = await getPendingOrderCount()
      expect(count).toBe(2) // pending + failed only
    })
  })

  describe('Sync Metadata', () => {
    it('sets and gets sync timestamp', async () => {
      const now = Date.now()
      await setSyncMeta('products_1', now)

      const result = await getSyncMeta('products_1')
      expect(result).toBe(now)
    })

    it('returns null for missing key', async () => {
      const result = await getSyncMeta('nonexistent')
      expect(result).toBeNull()
    })

    it('detects stale cache (no sync meta)', async () => {
      const stale = await isCacheStale('never_synced')
      expect(stale).toBe(true)
    })

    it('detects stale cache (old sync)', async () => {
      const oldTime = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      await setSyncMeta('old_sync', oldTime)

      const stale = await isCacheStale('old_sync')
      expect(stale).toBe(true)
    })

    it('detects fresh cache', async () => {
      await setSyncMeta('fresh_sync', Date.now())

      const stale = await isCacheStale('fresh_sync')
      expect(stale).toBe(false)
    })

    it('respects custom maxAge', async () => {
      const recentTime = Date.now() - 10 * 1000 // 10 seconds ago
      await setSyncMeta('custom_age', recentTime)

      // Fresh within 1 hour
      expect(await isCacheStale('custom_age', 60 * 60 * 1000)).toBe(false)
      // Stale within 5 seconds
      expect(await isCacheStale('custom_age', 5 * 1000)).toBe(true)
    })
  })

  describe('clearAllCache', () => {
    it('clears products, customers, categories, sync_meta but not pending_orders', async () => {
      await cacheProducts([makeCachedProduct(1, 1)], 1)
      await cacheCustomers([makeCachedCustomer(1)])
      await cacheCategories([{ id: 1, name: 'Cat', parent_id: null, cached_at: Date.now() }])
      await setSyncMeta('test', Date.now())
      await savePendingOrder(makePendingOrder())

      await clearAllCache()

      expect(await getCachedProducts(1)).toHaveLength(0)
      expect(await getCachedCustomers()).toHaveLength(0)
      expect(await getCachedCategories()).toHaveLength(0)
      expect(await getSyncMeta('test')).toBeNull()
      // Pending orders should NOT be cleared
      expect(await getPendingOrders()).toHaveLength(1)
    })
  })

  describe('getDatabaseSize', () => {
    it('returns counts for each store', async () => {
      await cacheProducts([makeCachedProduct(1, 1), makeCachedProduct(2, 1)], 1)
      await cacheCustomers([makeCachedCustomer(1)])
      await savePendingOrder(makePendingOrder())

      const size = await getDatabaseSize()

      expect(size.products).toBe(2)
      expect(size.customers).toBe(1)
      expect(size.pendingOrders).toBe(1)
    })
  })

  describe('deleteDatabase', () => {
    it('deletes the database and allows reinit', async () => {
      await cacheCustomers([makeCachedCustomer(1)])
      resetDBConnection()

      await deleteDatabase()
      await initDB()

      const customers = await getCachedCustomers()
      expect(customers).toHaveLength(0)
    })

    it('rejects when indexedDB.deleteDatabase fails', async () => {
      resetDBConnection()
      const mockError = new DOMException('Delete failed')
      vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
        const request = {
          onsuccess: null as ((ev: Event) => void) | null,
          onerror: null as ((ev: Event) => void) | null,
          onblocked: null as ((ev: Event) => void) | null,
          error: mockError,
          result: undefined,
        } as unknown as IDBOpenDBRequest
        queueMicrotask(() => {
          if (request.onerror) request.onerror(new Event('error'))
        })
        return request
      })

      await expect(deleteDatabase()).rejects.toBe(mockError)

      vi.restoreAllMocks()
      // Clean up for subsequent tests
      resetDBConnection()
      await initDB()
    })

    it('resolves when blocked after timeout', async () => {
      vi.useFakeTimers()
      resetDBConnection()
      vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
        const request = {
          onsuccess: null as ((ev: Event) => void) | null,
          onerror: null as ((ev: Event) => void) | null,
          onblocked: null as ((ev: Event) => void) | null,
          error: null,
          result: undefined,
        } as unknown as IDBOpenDBRequest
        queueMicrotask(() => {
          if (request.onblocked) request.onblocked(new Event('blocked') as IDBVersionChangeEvent)
        })
        return request
      })

      const promise = deleteDatabase()

      // Allow microtask (onblocked setter) to fire
      await vi.advanceTimersByTimeAsync(0)
      // Advance past the 500ms setTimeout inside onblocked
      await vi.advanceTimersByTimeAsync(500)

      await expect(promise).resolves.toBeUndefined()

      vi.useRealTimers()
      vi.restoreAllMocks()
      // Clean up for subsequent tests
      resetDBConnection()
      await initDB()
    })
  })
})
