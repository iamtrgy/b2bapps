/**
 * IndexedDB Service for Offline Support
 * Handles local storage of products, customers, categories, and pending orders
 */

const DB_NAME = 'pos_offline_db'
const DB_VERSION = 2

// Store names
const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  CATEGORIES: 'categories',
  PENDING_ORDERS: 'pending_orders',
  ORDERS: 'orders',
  SYNC_META: 'sync_meta',
} as const

let db: IDBDatabase | null = null

/**
 * Reset database connection (force reopen)
 */
export function resetDBConnection() {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Delete the entire database (use when schema changes)
 */
export async function deleteDatabase(): Promise<void> {
  resetDBConnection()
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => {
      console.log('Database deleted successfully')
      resolve()
    }
    request.onerror = () => {
      console.error('Failed to delete database:', request.error)
      reject(request.error)
    }
    request.onblocked = () => {
      console.warn('Database deletion blocked - closing connections')
      // Force resolve after a short delay even if blocked
      setTimeout(() => {
        console.log('Proceeding with reload despite blocked deletion')
        resolve()
      }, 500)
    }
  })
}

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      reject(request.error)
    }

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked. Please close other tabs using this app.')
    }

    request.onsuccess = () => {
      db = request.result

      // Handle connection being closed by another tab upgrading
      db.onversionchange = () => {
        db?.close()
        db = null
        console.log('Database version changed, connection closed')
      }

      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      console.log('Upgrading IndexedDB from version', event.oldVersion, 'to', event.newVersion)
      const database = (event.target as IDBOpenDBRequest).result

      // Products store - indexed by id and customer_id
      if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: ['id', 'customer_id'] })
        productStore.createIndex('customer_id', 'customer_id', { unique: false })
        productStore.createIndex('category_id', 'category_id', { unique: false })
      }

      // Customers store
      if (!database.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = database.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' })
        customerStore.createIndex('company_name', 'company_name', { unique: false })
      }

      // Categories store
      if (!database.objectStoreNames.contains(STORES.CATEGORIES)) {
        database.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' })
      }

      // Pending orders store - orders created offline
      if (!database.objectStoreNames.contains(STORES.PENDING_ORDERS)) {
        const orderStore = database.createObjectStore(STORES.PENDING_ORDERS, { keyPath: 'local_id', autoIncrement: true })
        orderStore.createIndex('customer_id', 'customer_id', { unique: false })
        orderStore.createIndex('created_at', 'created_at', { unique: false })
        orderStore.createIndex('sync_status', 'sync_status', { unique: false })
      }

      // Sync metadata store - tracks last sync times
      if (!database.objectStoreNames.contains(STORES.SYNC_META)) {
        database.createObjectStore(STORES.SYNC_META, { keyPath: 'key' })
      }

      // Orders store - cached orders for offline viewing
      if (!database.objectStoreNames.contains(STORES.ORDERS)) {
        const ordersStore = database.createObjectStore(STORES.ORDERS, { keyPath: 'id' })
        ordersStore.createIndex('customer_id', 'customer_id', { unique: false })
        ordersStore.createIndex('created_at', 'created_at', { unique: false })
      }
    }
  })
}

/**
 * Generic function to get all items from a store
 */
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Generic function to get items by index
 */
async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Generic function to put item in store
 */
async function putInStore<T>(storeName: string, item: T): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Generic function to put multiple items in store
 */
async function putManyInStore<T>(storeName: string, items: T[]): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    items.forEach(item => store.put(item))

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * Generic function to delete from store
 */
async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all items from a store
 */
async function clearStore(storeName: string): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ============ Products ============

export interface CachedProduct {
  id: number
  customer_id: number
  name: string
  sku: string
  image_url: string | null
  base_price: number
  box_price: number
  piece_price: number
  broken_case_piece_price: number
  total_discount: number
  total_discount_percent: number
  pieces_per_box: number
  allow_broken_case: boolean
  vat_rate: { rate: number } | null
  category_id: number | null
  availability_status: string
  can_purchase: boolean
  allow_backorder: boolean
  is_preorder: boolean
  cached_at: number
}

export async function cacheProducts(products: CachedProduct[], customerId: number): Promise<void> {
  const itemsWithMeta = products.map(p => ({
    ...p,
    customer_id: customerId,
    cached_at: Date.now(),
  }))
  await putManyInStore(STORES.PRODUCTS, itemsWithMeta)
  await setSyncMeta(`products_${customerId}`, Date.now())
}

export async function getCachedProducts(customerId: number): Promise<CachedProduct[]> {
  return getByIndex(STORES.PRODUCTS, 'customer_id', customerId)
}

export async function getCachedProductsByCategory(customerId: number, categoryId: number): Promise<CachedProduct[]> {
  const allProducts = await getCachedProducts(customerId)
  return allProducts.filter(p => p.category_id === categoryId)
}

export async function clearProductCache(customerId?: number): Promise<void> {
  if (customerId) {
    const products = await getCachedProducts(customerId)
    const database = await initDB()
    const transaction = database.transaction(STORES.PRODUCTS, 'readwrite')
    const store = transaction.objectStore(STORES.PRODUCTS)

    products.forEach(p => store.delete([p.id, customerId]))

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
  await clearStore(STORES.PRODUCTS)
}

// ============ Customers ============

export interface CachedCustomer {
  id: number
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  customer_tier: string
  cached_at: number
}

export async function cacheCustomers(customers: CachedCustomer[]): Promise<void> {
  const itemsWithMeta = customers.map(c => ({
    ...c,
    cached_at: Date.now(),
  }))
  await putManyInStore(STORES.CUSTOMERS, itemsWithMeta)
  await setSyncMeta('customers', Date.now())
}

export async function getCachedCustomers(): Promise<CachedCustomer[]> {
  return getAllFromStore(STORES.CUSTOMERS)
}

export async function clearCustomerCache(): Promise<void> {
  await clearStore(STORES.CUSTOMERS)
}

// ============ Categories ============

export interface CachedCategory {
  id: number
  name: string
  parent_id: number | null
  product_count?: number
  children?: CachedCategory[]
  cached_at: number
}

export async function cacheCategories(categories: CachedCategory[]): Promise<void> {
  const flattenCategories = (cats: CachedCategory[]): CachedCategory[] => {
    const result: CachedCategory[] = []
    cats.forEach(cat => {
      result.push({ ...cat, cached_at: Date.now() })
      if (cat.children) {
        result.push(...flattenCategories(cat.children))
      }
    })
    return result
  }

  const flatCategories = flattenCategories(categories)
  await putManyInStore(STORES.CATEGORIES, flatCategories)
  await setSyncMeta('categories', Date.now())
}

export async function getCachedCategories(): Promise<CachedCategory[]> {
  return getAllFromStore(STORES.CATEGORIES)
}

export async function clearCategoryCache(): Promise<void> {
  await clearStore(STORES.CATEGORIES)
}

// ============ Pending Orders ============

export interface PendingOrder {
  local_id?: number
  customer_id: number
  customer_name: string
  items: {
    product_id: number
    name: string
    quantity: number
    price: number
    base_price: number
    unit_type: 'piece' | 'box'
    pieces_per_box: number
    vat_rate: number
  }[]
  subtotal: number
  vat_total: number
  total: number
  notes: string
  created_at: number
  sync_status: 'pending' | 'syncing' | 'failed'
  sync_error?: string
  retry_count: number
}

export async function savePendingOrder(order: Omit<PendingOrder, 'local_id'>): Promise<number> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.PENDING_ORDERS, 'readwrite')
    const store = transaction.objectStore(STORES.PENDING_ORDERS)
    const request = store.add(order)

    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  return getAllFromStore(STORES.PENDING_ORDERS)
}

export async function getPendingOrdersByStatus(status: PendingOrder['sync_status']): Promise<PendingOrder[]> {
  return getByIndex(STORES.PENDING_ORDERS, 'sync_status', status)
}

export async function updatePendingOrder(order: PendingOrder): Promise<void> {
  await putInStore(STORES.PENDING_ORDERS, order)
}

export async function deletePendingOrder(localId: number): Promise<void> {
  await deleteFromStore(STORES.PENDING_ORDERS, localId)
}

export async function getPendingOrderCount(): Promise<number> {
  const orders = await getPendingOrders()
  return orders.filter(o => o.sync_status === 'pending' || o.sync_status === 'failed').length
}

// ============ Sync Metadata ============

interface SyncMeta {
  key: string
  timestamp: number
}

export async function setSyncMeta(key: string, timestamp: number): Promise<void> {
  await putInStore(STORES.SYNC_META, { key, timestamp })
}

export async function getSyncMeta(key: string): Promise<number | null> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_META, 'readonly')
    const store = transaction.objectStore(STORES.SYNC_META)
    const request = store.get(key)

    request.onsuccess = () => {
      const result = request.result as SyncMeta | undefined
      resolve(result?.timestamp ?? null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function isCacheStale(key: string, maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
  const lastSync = await getSyncMeta(key)
  if (!lastSync) return true
  return Date.now() - lastSync > maxAgeMs
}

// ============ Utility ============

export async function clearAllCache(): Promise<void> {
  await clearStore(STORES.PRODUCTS)
  await clearStore(STORES.CUSTOMERS)
  await clearStore(STORES.CATEGORIES)
  await clearStore(STORES.SYNC_META)
  // Note: We don't clear pending orders - they need to be synced
}

export async function getDatabaseSize(): Promise<{ products: number; customers: number; pendingOrders: number }> {
  const [products, customers, pendingOrders] = await Promise.all([
    getAllFromStore(STORES.PRODUCTS),
    getAllFromStore(STORES.CUSTOMERS),
    getAllFromStore(STORES.PENDING_ORDERS),
  ])

  return {
    products: (products as any[]).length,
    customers: (customers as any[]).length,
    pendingOrders: (pendingOrders as any[]).length,
  }
}
