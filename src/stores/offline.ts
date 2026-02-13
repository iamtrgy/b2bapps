/**
 * Offline Store - Manages network status, caching, and sync
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import {
  initDB,
  deleteDatabase,
  cacheProducts,
  getCachedProducts,
  getProductCountByIndex,
  cacheCustomers,
  getCachedCustomers,
  getCustomerCount,
  cacheCategories,
  getCachedCategories,
  savePendingOrder,
  getPendingOrders,
  getPendingOrderCount,
  deletePendingOrder,
  updatePendingOrder,
  isCacheStale,
  clearAllCache,
  type CachedProduct,
  type CachedCustomer,
  type CachedCategory,
  type PendingOrder,
} from '@/services/db'
import { orderApi, productApi, customerApi } from '@/services/api'

// Network check interval (30 seconds)
const NETWORK_CHECK_INTERVAL = 30000

export const useOfflineStore = defineStore('offline', () => {
  // State
  const isOnline = ref(true)
  const isInitialized = ref(false)
  const pendingOrderCount = ref(0)
  const isSyncing = ref(false)
  const lastSyncTime = ref<number | null>(null)
  const syncError = ref<string | null>(null)
  const isDownloading = ref(false)
  const downloadProgress = ref(0)
  const downloadType = ref<'products' | 'customers' | 'orders' | null>(null)
  const cachedProductCount = ref(0)
  const cachedCustomerCount = ref(0)
  const cachedOrderCount = ref(0)
  const lastProductSync = ref<number | null>(null)
  const lastCustomerSync = ref<number | null>(null)
  const lastOrderSync = ref<number | null>(null)
  let networkCheckInterval: ReturnType<typeof setInterval> | null = null

  // Getters
  const hasUnsyncedOrders = computed(() => pendingOrderCount.value > 0)

  // Check network connectivity by pinging the tenant's API
  async function checkNetworkStatus(): Promise<boolean> {
    return navigator.onLine
  }

  // Initialize the offline system
  async function initialize() {
    if (isInitialized.value) return

    try {
      const database = await initDB()

      // Check if database schema is outdated (missing 'orders' store)
      if (!database.objectStoreNames.contains('orders')) {
        console.warn('Database schema outdated. Resetting...')
        localStorage.removeItem('lastProductSync')
        localStorage.removeItem('lastCustomerSync')
        localStorage.removeItem('lastOrderSync')
        await deleteDatabase()
        // Reinitialize with new schema
        await initDB()
      }

      // Check network status immediately
      isOnline.value = await checkNetworkStatus()

      // Set up periodic network checks
      networkCheckInterval = setInterval(async () => {
        const wasOnline = isOnline.value
        isOnline.value = await checkNetworkStatus()

        // If we just came online, sync pending orders
        if (!wasOnline && isOnline.value) {
          console.log('Internet connection restored.')
          if (pendingOrderCount.value > 0) {
            syncPendingOrders()
          }
        }
      }, NETWORK_CHECK_INTERVAL)

      // Also listen to browser events as fallback
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Update pending order count
      pendingOrderCount.value = await getPendingOrderCount()

      // Load last sync times from localStorage
      const productSync = localStorage.getItem('lastProductSync')
      const customerSync = localStorage.getItem('lastCustomerSync')
      const orderSync = localStorage.getItem('lastOrderSync')
      if (productSync) lastProductSync.value = parseInt(productSync)
      if (customerSync) lastCustomerSync.value = parseInt(customerSync)
      if (orderSync) lastOrderSync.value = parseInt(orderSync)

      isInitialized.value = true

      // If we're online, try to sync any pending orders
      if (isOnline.value && pendingOrderCount.value > 0) {
        syncPendingOrders()
      }
    } catch (error) {
      console.error('Failed to initialize offline store:', error)
    }
  }

  // Handle coming online (browser event)
  async function handleOnline() {
    // Verify with actual network check
    const actuallyOnline = await checkNetworkStatus()
    if (actuallyOnline) {
      isOnline.value = true
      console.log('Network: Online')

      // Automatically sync pending orders when coming online
      if (pendingOrderCount.value > 0) {
        await syncPendingOrders()
      }
    }
  }

  // Handle going offline (browser event)
  async function handleOffline() {
    // Verify with actual network check
    const actuallyOnline = await checkNetworkStatus()
    if (!actuallyOnline) {
      isOnline.value = false
      console.log('Network: Offline')
    }
  }

  // Cache products for a customer
  async function cacheProductsForCustomer(products: any[], customerId: number) {
    try {
      const cachedProducts: CachedProduct[] = products.map(p => ({
        id: p.id,
        customer_id: customerId,
        name: p.name,
        sku: p.sku,
        image_url: p.image_url,
        base_price: p.base_price,
        box_price: p.box_price,
        piece_price: p.piece_price,
        broken_case_piece_price: p.broken_case_piece_price,
        total_discount: p.total_discount,
        total_discount_percent: p.total_discount_percent,
        pieces_per_box: p.pieces_per_box,
        allow_broken_case: p.allow_broken_case,
        vat_rate: p.vat_rate,
        category_id: p.category_id,
        availability_status: p.availability_status,
        can_purchase: p.can_purchase,
        allow_backorder: p.allow_backorder,
        is_preorder: p.is_preorder,
        cached_at: Date.now(),
      }))

      await cacheProducts(cachedProducts, customerId)
    } catch (error) {
      console.error('Failed to cache products:', error)
    }
  }

  // Download ALL products (for offline use)
  // apiCustomerId: customer ID to use for API call (for pricing)
  // cacheKey: ID to use for caching (0 = global cache for all customers)
  async function downloadAllProducts(apiCustomerId: number, cacheKey: number = 0): Promise<{ success: boolean; count: number }> {
    if (!isOnline.value || isDownloading.value) {
      return { success: false, count: 0 }
    }

    isDownloading.value = true
    downloadType.value = 'products'
    downloadProgress.value = 0

    try {
      const PAGE_SIZE = 100
      let offset = 0
      let allProducts: any[] = []
      let hasMore = true

      // Fetch all pages
      while (hasMore) {
        const response = await productApi.getAll(apiCustomerId, PAGE_SIZE, offset)
        allProducts.push(...response.products)

        hasMore = response.hasMore ?? false
        offset += PAGE_SIZE

        // Update progress (estimate based on total if available)
        if (response.total) {
          downloadProgress.value = Math.min(95, Math.round((allProducts.length / response.total) * 100))
        } else {
          downloadProgress.value = Math.min(95, downloadProgress.value + 10)
        }
      }

      // Cache all products with the cache key (0 = global)
      await cacheProductsForCustomer(allProducts, cacheKey)
      cachedProductCount.value = allProducts.length
      lastProductSync.value = Date.now()
      localStorage.setItem('lastProductSync', String(lastProductSync.value))
      downloadProgress.value = 100

      return { success: true, count: allProducts.length }
    } catch (error) {
      console.error('Failed to download products:', error)
      return { success: false, count: 0 }
    } finally {
      isDownloading.value = false
      downloadType.value = null
    }
  }

  // Get cached product count (uses IDB count instead of loading all data)
  async function getCachedProductCount(cacheKey: number = 0): Promise<number> {
    try {
      const count = await getProductCountByIndex(cacheKey)
      cachedProductCount.value = count
      return count
    } catch {
      return 0
    }
  }

  // Download ALL customers for offline use
  async function downloadAllCustomers(): Promise<{ success: boolean; count: number }> {
    if (!isOnline.value || isDownloading.value) {
      return { success: false, count: 0 }
    }

    isDownloading.value = true
    downloadType.value = 'customers'
    downloadProgress.value = 0

    try {
      let page = 1
      let allCustomers: any[] = []
      let hasMore = true

      // Fetch all pages
      while (hasMore) {
        const response = await customerApi.list(page)
        if (!response?.data || !response?.meta) {
          console.error('Invalid customer API response')
          break
        }
        allCustomers.push(...response.data)

        hasMore = response.meta.current_page < response.meta.last_page
        page++

        // Update progress
        downloadProgress.value = Math.min(95, Math.round((response.meta.current_page / response.meta.last_page) * 100))
      }

      // Cache all customers
      await cacheCustomerList(allCustomers)
      cachedCustomerCount.value = allCustomers.length
      lastCustomerSync.value = Date.now()
      localStorage.setItem('lastCustomerSync', String(lastCustomerSync.value))
      downloadProgress.value = 100

      return { success: true, count: allCustomers.length }
    } catch (error) {
      console.error('Failed to download customers:', error)
      return { success: false, count: 0 }
    } finally {
      isDownloading.value = false
      downloadType.value = null
    }
  }

  // Get cached customer count (uses IDB count instead of loading all data)
  async function getCachedCustomerCount(): Promise<number> {
    try {
      const count = await getCustomerCount()
      cachedCustomerCount.value = count
      return count
    } catch {
      return 0
    }
  }

  // Download recent orders for offline reference
  async function downloadRecentOrders(): Promise<{ success: boolean; count: number; needsReset?: boolean }> {
    if (!isOnline.value || isDownloading.value) {
      return { success: false, count: 0 }
    }

    // Check if orders store exists before downloading
    const database = await initDB()
    if (!database.objectStoreNames.contains('orders')) {
      console.error('Orders store not found. Database needs to be reset.')
      return { success: false, count: 0, needsReset: true }
    }

    isDownloading.value = true
    downloadType.value = 'orders'
    downloadProgress.value = 0

    try {
      let page = 1
      let allOrders: any[] = []
      const MAX_PAGES = 10 // Limit to last 500 orders

      // Fetch recent orders (up to MAX_PAGES)
      while (page <= MAX_PAGES) {
        const response = await orderApi.list(page)
        if (!response?.data || !response?.meta) {
          console.error('Invalid order API response')
          break
        }
        allOrders.push(...response.data)

        if (response.meta.current_page >= response.meta.last_page) break
        page++

        // Update progress
        downloadProgress.value = Math.min(95, Math.round((page / Math.min(response.meta.last_page, MAX_PAGES)) * 100))
      }

      // Cache orders in IndexedDB
      await cacheOrders(allOrders)
      cachedOrderCount.value = allOrders.length
      lastOrderSync.value = Date.now()
      localStorage.setItem('lastOrderSync', String(lastOrderSync.value))
      downloadProgress.value = 100

      return { success: true, count: allOrders.length }
    } catch (error) {
      console.error('Failed to download orders:', error)
      return { success: false, count: 0 }
    } finally {
      isDownloading.value = false
      downloadType.value = null
    }
  }

  // Cache orders to IndexedDB
  async function cacheOrders(orders: any[]) {
    const database = await initDB()

    // Check if store exists
    if (!database.objectStoreNames.contains('orders')) {
      console.error('Orders store not found. Please clear browser data and reload.')
      return
    }

    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction('orders', 'readwrite')
      const store = tx.objectStore('orders')

      // Clear existing orders
      store.clear()

      // Add new orders
      for (const order of orders) {
        store.put({
          ...order,
          cached_at: Date.now(),
        })
      }

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // Get cached orders
  async function getOfflineOrders(): Promise<any[]> {
    try {
      const database = await initDB()

      // Check if store exists
      if (!database.objectStoreNames.contains('orders')) {
        return []
      }

      return new Promise((resolve, reject) => {
        const tx = database.transaction('orders', 'readonly')
        const store = tx.objectStore('orders')
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get cached orders:', error)
      return []
    }
  }

  // Get cached order count
  async function getCachedOrderCount(): Promise<number> {
    try {
      const database = await initDB()

      // Check if store exists
      if (!database.objectStoreNames.contains('orders')) {
        cachedOrderCount.value = 0
        return 0
      }

      return new Promise((resolve, reject) => {
        const tx = database.transaction('orders', 'readonly')
        const store = tx.objectStore('orders')
        const request = store.count()

        request.onsuccess = () => {
          cachedOrderCount.value = request.result
          resolve(request.result)
        }
        request.onerror = () => reject(request.error)
      })
    } catch {
      return 0
    }
  }

  // Get cached products for a customer
  async function getOfflineProducts(customerId: number): Promise<CachedProduct[]> {
    try {
      return await getCachedProducts(customerId)
    } catch (error) {
      console.error('Failed to get cached products:', error)
      return []
    }
  }

  // Cache customers
  async function cacheCustomerList(customers: any[]) {
    try {
      const cachedCustomers: CachedCustomer[] = customers.map(c => ({
        id: c.id,
        company_name: c.company_name,
        contact_name: c.contact_name,
        contact_email: c.contact_email,
        contact_phone: c.contact_phone,
        customer_tier: c.customer_tier,
        cached_at: Date.now(),
      }))

      await cacheCustomers(cachedCustomers)
    } catch (error) {
      console.error('Failed to cache customers:', error)
    }
  }

  // Get cached customers
  async function getOfflineCustomers(): Promise<CachedCustomer[]> {
    try {
      return await getCachedCustomers()
    } catch (error) {
      console.error('Failed to get cached customers:', error)
      return []
    }
  }

  // Cache categories
  async function cacheCategoryList(categories: any[]) {
    try {
      const cachedCategories: CachedCategory[] = categories.map(c => ({
        id: c.id,
        name: c.name,
        parent_id: c.parent_id,
        product_count: c.product_count,
        children: c.children,
        cached_at: Date.now(),
      }))

      await cacheCategories(cachedCategories)
    } catch (error) {
      console.error('Failed to cache categories:', error)
    }
  }

  // Get cached categories
  async function getOfflineCategories(): Promise<CachedCategory[]> {
    try {
      return await getCachedCategories()
    } catch (error) {
      console.error('Failed to get cached categories:', error)
      return []
    }
  }

  // Save order offline when no network
  async function saveOrderOffline(orderData: {
    customerId: number
    customerName: string
    items: any[]
    subtotal: number
    vatTotal: number
    total: number
    notes: string
  }): Promise<number> {
    const pendingOrder: Omit<PendingOrder, 'local_id'> = {
      customer_id: orderData.customerId,
      customer_name: orderData.customerName,
      items: orderData.items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        base_price: item.base_price,
        unit_type: item.unit_type,
        pieces_per_box: item.pieces_per_box,
        vat_rate: item.vat_rate,
      })),
      subtotal: orderData.subtotal,
      vat_total: orderData.vatTotal,
      total: orderData.total,
      notes: orderData.notes,
      created_at: Date.now(),
      sync_status: 'pending',
      retry_count: 0,
    }

    const localId = await savePendingOrder(pendingOrder)
    pendingOrderCount.value = await getPendingOrderCount()

    return localId
  }

  // Get all pending orders
  async function getAllPendingOrders(): Promise<PendingOrder[]> {
    return await getPendingOrders()
  }

  // Sync pending orders to server
  async function syncPendingOrders(): Promise<{ success: number; failed: number }> {
    if (isSyncing.value || !isOnline.value) {
      return { success: 0, failed: 0 }
    }

    isSyncing.value = true
    syncError.value = null

    let successCount = 0
    let failedCount = 0

    try {
      const pendingOrders = await getPendingOrders()
      const ordersToSync = pendingOrders.filter(
        o => o.sync_status === 'pending' || o.sync_status === 'failed'
      )

      for (const order of ordersToSync) {
        try {
          // Mark as syncing
          await updatePendingOrder({ ...order, sync_status: 'syncing' })

          // Create order on server
          const result = await orderApi.create({
            customer_id: order.customer_id,
            items: order.items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              base_price: item.base_price,
              unit_type: item.unit_type,
              pieces_per_box: item.pieces_per_box,
              vat_rate: item.vat_rate,
            })),
            notes: order.notes || undefined,
            applied_promotions: [],
          })

          if (result.success) {
            // Remove from pending orders
            await deletePendingOrder(order.local_id!)
            successCount++
          } else {
            throw new Error(result.message || 'Failed to create order')
          }
        } catch (error: any) {
          console.error('Failed to sync order:', order.local_id, error)
          failedCount++

          // Mark as failed with error message
          await updatePendingOrder({
            ...order,
            sync_status: 'failed',
            sync_error: error.message || 'Unknown error',
            retry_count: order.retry_count + 1,
          })
        }
      }

      lastSyncTime.value = Date.now()
      pendingOrderCount.value = await getPendingOrderCount()

      if (failedCount > 0) {
        syncError.value = `${failedCount} sipariş gönderilemedi`
      }
    } catch (error: any) {
      console.error('Sync failed:', error)
      syncError.value = error.message || 'Senkronizasyon başarısız'
    } finally {
      isSyncing.value = false
    }

    return { success: successCount, failed: failedCount }
  }

  // Check if cache is stale (older than 24 hours by default)
  async function isDataStale(key: string, maxAgeMs?: number): Promise<boolean> {
    return await isCacheStale(key, maxAgeMs)
  }

  // Clear all cached data (except pending orders)
  async function clearCache() {
    await clearAllCache()
  }

  // Cleanup on unmount
  function cleanup() {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (networkCheckInterval) {
      clearInterval(networkCheckInterval)
      networkCheckInterval = null
    }
  }

  return {
    // State
    isOnline,
    isInitialized,
    pendingOrderCount,
    isSyncing,
    lastSyncTime,
    syncError,
    isDownloading,
    downloadProgress,
    downloadType,
    cachedProductCount,
    cachedCustomerCount,
    cachedOrderCount,
    lastProductSync,
    lastCustomerSync,
    lastOrderSync,
    // Getters
    hasUnsyncedOrders,
    // Actions
    initialize,
    cleanup,
    cacheProductsForCustomer,
    getOfflineProducts,
    downloadAllProducts,
    getCachedProductCount,
    cacheCustomerList,
    getOfflineCustomers,
    downloadAllCustomers,
    getCachedCustomerCount,
    cacheCategoryList,
    getOfflineCategories,
    saveOrderOffline,
    getAllPendingOrders,
    syncPendingOrders,
    downloadRecentOrders,
    getOfflineOrders,
    getCachedOrderCount,
    isDataStale,
    clearCache,
  }
})
