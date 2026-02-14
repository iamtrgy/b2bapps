import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productApi } from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import type { Product } from '@/types'
import type { CachedProduct } from '@/services/db'
import { logger } from '@/utils/logger'
import { isCanceledError } from '@/utils/error'

const PAGE_SIZE = 50

/** Map a CachedProduct (from IndexedDB) to the full Product shape with safe defaults */
function cachedToProduct(p: CachedProduct): Product {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? null,
    barcode_box: p.barcode_box ?? null,
    image_url: p.image_url,
    base_price: p.base_price,
    price_list_price: p.base_price,
    price_list_discount: 0,
    price_list_discount_percent: 0,
    promotion_discount: 0,
    promotion_discount_percent: 0,
    customer_price: p.box_price,
    total_discount: p.total_discount,
    total_discount_percent: p.total_discount_percent,
    pricing_source: 'cache',
    promotion_id: null,
    promotion_name: null,
    promotion_type: null,
    promotion_value: null,
    pieces_per_box: p.pieces_per_box,
    piece_price: p.piece_price,
    box_price: p.box_price,
    allow_broken_case: p.allow_broken_case,
    broken_case_discount: 0,
    broken_case_piece_price: p.broken_case_piece_price,
    vat_rate: p.vat_rate,
    stock_quantity: 0,
    availability_status: (p.availability_status as Product['availability_status']) || 'in_stock',
    can_purchase: p.can_purchase,
    allow_backorder: p.allow_backorder,
    is_preorder: p.is_preorder,
    boxes_per_case: 1,
    moq_quantity: 1,
    moq_unit: 'box',
    category_id: p.category_id,
  } as Product
}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useProductStore = defineStore('products', () => {
  // In-memory offline product cache — loaded once from IDB per customer, reused for all operations
  let offlineCache: { customerId: number; products: CachedProduct[] } | null = null

  async function getOfflineCached(customerId: number): Promise<CachedProduct[]> {
    if (offlineCache?.customerId === customerId) return offlineCache.products
    const offlineStore = useOfflineStore()
    let cached = await offlineStore.getOfflineProducts(customerId)
    // Fallback to global cache (cacheKey=0 from "Download All") if customer-specific cache is empty
    if (cached.length === 0 && customerId !== 0) {
      cached = await offlineStore.getOfflineProducts(0)
    }
    offlineCache = { customerId, products: cached }
    return cached
  }

  function clearOfflineCache() {
    offlineCache = null
  }

  // In-memory cache timestamps — tracks when each tab was last fetched
  const cacheTimestamps: Record<string, { fetchedAt: number; customerId: number; categoryId?: number }> = {}

  function cacheKey(tab: string, categoryId?: number): string {
    return tab === 'category' && categoryId != null ? `category:${categoryId}` : tab
  }

  function isCacheFresh(tab: string, customerId: number, categoryId?: number): boolean {
    const entry = cacheTimestamps[cacheKey(tab, categoryId)]
    if (!entry) return false
    if (entry.customerId !== customerId) return false
    return Date.now() - entry.fetchedAt < CACHE_TTL
  }

  function markCacheFresh(tab: string, customerId: number, categoryId?: number) {
    cacheTimestamps[cacheKey(tab, categoryId)] = { fetchedAt: Date.now(), customerId }
  }

  function invalidateCache(tab?: string) {
    if (tab) {
      // Clear all keys starting with tab (handles category:* entries)
      for (const key in cacheTimestamps) {
        if (key === tab || key.startsWith(tab + ':')) delete cacheTimestamps[key]
      }
      if (tab === 'category') categoryProductsCache.clear()
    } else {
      for (const key in cacheTimestamps) delete cacheTimestamps[key]
      categoryProductsCache.clear()
    }
  }

  // Abort controller for cancelling in-flight requests on tab switch
  let currentAbortController: AbortController | null = null

  function cancelPendingRequest() {
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
    }
  }

  function newAbortSignal(): AbortSignal {
    cancelPendingRequest()
    currentAbortController = new AbortController()
    return currentAbortController.signal
  }

  // Per-category product cache (categoryId → products)
  const categoryProductsCache = new Map<number, { products: Product[]; hasMore: boolean; totalCount: number }>()

  // State
  const products = ref<Product[]>([])
  const allProducts = ref<Product[]>([])
  const categoryProducts = ref<Product[]>([])
  const bestSellers = ref<Product[]>([])
  const favorites = ref<Product[]>([])
  const discounted = ref<Product[]>([])
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const searchQuery = ref('')
  const activeCategoryId = ref<number | null>(null)
  const activeTab = ref<'search' | 'all' | 'category' | 'best-sellers' | 'favorites' | 'discounted'>('best-sellers')
  const isOfflineMode = ref(false)

  // Pagination state
  const offset = ref(0)
  const hasMore = ref(false)
  const totalCount = ref(0)

  // Helper to sort products with in-stock first
  function sortByAvailability(items: Product[]): Product[] {
    return [...items].sort((a, b) => {
      // In-stock products first
      if (a.can_purchase && !b.can_purchase) return -1
      if (!a.can_purchase && b.can_purchase) return 1
      return 0
    })
  }

  // Getters — sorted copies are cached per-tab by computed; no redundant re-sorts
  const sortedSearch = computed(() => sortByAvailability(products.value))
  const sortedAll = computed(() => sortByAvailability(allProducts.value))
  const sortedCategory = computed(() => sortByAvailability(categoryProducts.value))
  const sortedBestSellers = computed(() => sortByAvailability(bestSellers.value))
  const sortedFavorites = computed(() => sortByAvailability(favorites.value))
  const sortedDiscounted = computed(() => sortByAvailability(discounted.value))

  const displayProducts = computed(() => {
    switch (activeTab.value) {
      case 'all': return sortedAll.value
      case 'category': return sortedCategory.value
      case 'best-sellers': return sortedBestSellers.value
      case 'favorites': return sortedFavorites.value
      case 'discounted': return sortedDiscounted.value
      default: return sortedSearch.value
    }
  })

  const hasProducts = computed(() => displayProducts.value.length > 0)
  const productCount = computed(() => displayProducts.value.length)

  // Shared offline search helper
  async function filterOfflineProducts(query: string, customerId: number): Promise<Product[]> {
    const cachedProducts = await getOfflineCached(customerId)
    const queryLower = query.toLowerCase()
    return cachedProducts.filter(p =>
      p.name.toLowerCase().includes(queryLower) ||
      p.sku?.toLowerCase().includes(queryLower) ||
      p.barcode?.toLowerCase().includes(queryLower) ||
      p.barcode_box?.toLowerCase().includes(queryLower)
    ).map(cachedToProduct)
  }

  // Actions
  async function searchProducts(query: string, customerId: number) {
    searchQuery.value = query
    activeTab.value = 'search'

    if (!query.trim()) {
      products.value = []
      return
    }

    isLoading.value = true
    const offlineStore = useOfflineStore()

    try {
      if (offlineStore.isOnline) {
        const response = await productApi.search(query, customerId)
        products.value = response.products
        isOfflineMode.value = false
      } else {
        products.value = await filterOfflineProducts(query, customerId)
        isOfflineMode.value = true
      }
    } catch (error) {
      logger.error('Failed to search products:', error)
      try {
        products.value = await filterOfflineProducts(query, customerId)
        isOfflineMode.value = true
      } catch {
        products.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  async function findByBarcode(barcode: string, customerId: number) {
    isLoading.value = true
    try {
      const response = await productApi.findByBarcode(barcode, customerId)
      return response
    } catch (error) {
      logger.error('Failed to find product by barcode:', error)
      return { success: false, message: 'Product not found' }
    } finally {
      isLoading.value = false
    }
  }

  async function loadBestSellers(customerId: number, forceRefresh = false) {
    activeTab.value = 'best-sellers'
    offset.value = 0
    hasMore.value = false
    totalCount.value = 0

    // Use cached data if fresh
    if (!forceRefresh && isCacheFresh('best-sellers', customerId)) {
      return
    }

    isLoading.value = true
    const signal = newAbortSignal()

    const offlineStore = useOfflineStore()

    try {
      if (offlineStore.isOnline) {
        // Online: fetch from API and cache
        const response = await productApi.getBestSellers(customerId, signal)
        bestSellers.value = response.products
        isOfflineMode.value = false
        markCacheFresh('best-sellers', customerId)

        // Cache products for offline use
        offlineStore.cacheProductsForCustomer(response.products, customerId)
      } else {
        // Offline: use cached data (show all products as fallback)
        const cachedProducts = await getOfflineCached(customerId)
        bestSellers.value = cachedProducts.slice(0, 20).map(cachedToProduct)
        isOfflineMode.value = true
      }
    } catch (error: unknown) {
      if (isCanceledError(error) || signal.aborted) return
      logger.error('Failed to load best sellers:', error)
      // Try to use cached data on error
      try {
        const cachedProducts = await getOfflineCached(customerId)
        if (cachedProducts.length > 0) {
          bestSellers.value = cachedProducts.slice(0, 20).map(cachedToProduct)
          isOfflineMode.value = true
        } else {
          bestSellers.value = []
        }
      } catch {
        bestSellers.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  async function loadFavorites(customerId: number, forceRefresh = false) {
    activeTab.value = 'favorites'
    offset.value = 0
    hasMore.value = false
    totalCount.value = 0

    if (!forceRefresh && isCacheFresh('favorites', customerId)) {
      return
    }

    isLoading.value = true
    const signal = newAbortSignal()
    try {
      const response = await productApi.getFavorites(customerId, signal)
      favorites.value = response.products
      markCacheFresh('favorites', customerId)
    } catch (error: unknown) {
      if (isCanceledError(error) || signal.aborted) return
      logger.error('Failed to load favorites:', error)
      favorites.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function loadDiscounted(customerId: number, forceRefresh = false) {
    activeTab.value = 'discounted'
    offset.value = 0
    hasMore.value = false
    totalCount.value = 0

    if (!forceRefresh && isCacheFresh('discounted', customerId)) {
      return
    }

    isLoading.value = true
    const signal = newAbortSignal()
    try {
      const response = await productApi.getDiscounted(customerId, signal)
      discounted.value = response.products
      markCacheFresh('discounted', customerId)
    } catch (error: unknown) {
      if (isCanceledError(error) || signal.aborted) return
      logger.error('Failed to load discounted products:', error)
      discounted.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function loadByCategory(customerId: number, categoryId: number, forceRefresh = false) {
    activeTab.value = 'category'
    activeCategoryId.value = categoryId
    offset.value = 0

    // Restore from per-category cache if fresh
    if (!forceRefresh && isCacheFresh('category', customerId, categoryId)) {
      const cached = categoryProductsCache.get(categoryId)
      if (cached) {
        categoryProducts.value = cached.products
        hasMore.value = cached.hasMore
        totalCount.value = cached.totalCount
      }
      return
    }

    isLoading.value = true
    const signal = newAbortSignal()

    const offlineStore = useOfflineStore()

    try {
      if (offlineStore.isOnline) {
        // Online: fetch from API
        const response = await productApi.getByCategory(customerId, categoryId, PAGE_SIZE, 0, signal)
        categoryProducts.value = response.products
        hasMore.value = response.hasMore ?? false
        totalCount.value = response.total ?? 0
        isOfflineMode.value = false
        markCacheFresh('category', customerId, categoryId)
        categoryProductsCache.set(categoryId, {
          products: response.products,
          hasMore: hasMore.value,
          totalCount: totalCount.value,
        })

        // Cache products
        offlineStore.cacheProductsForCustomer(response.products, customerId)
      } else {
        // Offline: filter cached products by category with client-side pagination
        const cachedProducts = (await getOfflineCached(customerId)).filter(p =>
          p.category_id === categoryId
        ).map(cachedToProduct)
        offlineCachedProducts.value = cachedProducts
        categoryProducts.value = cachedProducts.slice(0, PAGE_SIZE)
        hasMore.value = cachedProducts.length > PAGE_SIZE
        totalCount.value = cachedProducts.length
        isOfflineMode.value = true
      }
    } catch (error: unknown) {
      if (isCanceledError(error) || signal.aborted) return
      logger.error('Failed to load category products:', error)
      // Try offline mode on error
      try {
        const cachedProducts = (await getOfflineCached(customerId)).filter(p =>
          p.category_id === categoryId
        ).map(cachedToProduct)
        offlineCachedProducts.value = cachedProducts
        categoryProducts.value = cachedProducts.slice(0, PAGE_SIZE)
        hasMore.value = cachedProducts.length > PAGE_SIZE
        totalCount.value = cachedProducts.length
        isOfflineMode.value = true
      } catch {
        categoryProducts.value = []
        hasMore.value = false
      }
    } finally {
      isLoading.value = false
    }
  }

  // Store for offline pagination
  const offlineCachedProducts = ref<Product[]>([])

  async function loadAll(customerId: number, forceRefresh = false) {
    activeTab.value = 'all'
    offset.value = 0

    if (!forceRefresh && isCacheFresh('all', customerId)) {
      return
    }

    isLoading.value = true
    const signal = newAbortSignal()

    const offlineStore = useOfflineStore()

    try {
      if (offlineStore.isOnline) {
        // Online: fetch from API and cache
        const response = await productApi.getAll(customerId, PAGE_SIZE, 0, signal)
        allProducts.value = response.products
        hasMore.value = response.hasMore ?? false
        totalCount.value = response.total ?? 0
        isOfflineMode.value = false
        offlineCachedProducts.value = [] // Clear offline cache
        markCacheFresh('all', customerId)

        // Cache products for offline use
        offlineStore.cacheProductsForCustomer(response.products, customerId)
      } else {
        // Offline: use cached data with client-side pagination
        const cachedProducts = (await getOfflineCached(customerId)).map(cachedToProduct)
        offlineCachedProducts.value = cachedProducts
        allProducts.value = cachedProducts.slice(0, PAGE_SIZE)
        hasMore.value = cachedProducts.length > PAGE_SIZE
        totalCount.value = cachedProducts.length
        isOfflineMode.value = true
      }
    } catch (error: unknown) {
      if (isCanceledError(error) || signal.aborted) return
      logger.error('Failed to load all products:', error)
      // Try to use cached data on error
      try {
        const cachedProducts = (await getOfflineCached(customerId)).map(cachedToProduct)
        if (cachedProducts.length > 0) {
          offlineCachedProducts.value = cachedProducts
          allProducts.value = cachedProducts.slice(0, PAGE_SIZE)
          hasMore.value = cachedProducts.length > PAGE_SIZE
          totalCount.value = cachedProducts.length
          isOfflineMode.value = true
        } else {
          allProducts.value = []
          hasMore.value = false
        }
      } catch {
        allProducts.value = []
        hasMore.value = false
      }
    } finally {
      isLoading.value = false
    }
  }

  // Load more products (for infinite scroll)
  async function loadMore(customerId: number) {
    if (!hasMore.value || isLoadingMore.value || isLoading.value) return

    const newOffset = offset.value + PAGE_SIZE
    isLoadingMore.value = true

    try {
      // Offline: client-side pagination from cached data
      if (isOfflineMode.value && offlineCachedProducts.value.length > 0) {
        const nextBatch = offlineCachedProducts.value.slice(newOffset, newOffset + PAGE_SIZE)
        if (activeTab.value === 'all') {
          allProducts.value.push(...nextBatch)
        } else if (activeTab.value === 'category') {
          categoryProducts.value.push(...nextBatch)
        }
        offset.value = newOffset
        hasMore.value = newOffset + PAGE_SIZE < offlineCachedProducts.value.length
        return
      }

      // Online: fetch from API
      let response
      if (activeTab.value === 'all') {
        response = await productApi.getAll(customerId, PAGE_SIZE, newOffset)
        allProducts.value.push(...response.products)
      } else if (activeTab.value === 'category' && activeCategoryId.value) {
        response = await productApi.getByCategory(customerId, activeCategoryId.value, PAGE_SIZE, newOffset)
        categoryProducts.value.push(...response.products)
      } else {
        return // Other tabs don't support pagination
      }

      offset.value = newOffset
      hasMore.value = response.hasMore ?? false
    } catch (error) {
      logger.error('Failed to load more products:', error)
    } finally {
      isLoadingMore.value = false
    }
  }

  function setActiveTab(tab: 'search' | 'all' | 'category' | 'best-sellers' | 'favorites' | 'discounted') {
    activeTab.value = tab
  }

  function clearSearch() {
    searchQuery.value = ''
    products.value = []
  }

  function reset() {
    products.value = []
    allProducts.value = []
    categoryProducts.value = []
    bestSellers.value = []
    favorites.value = []
    discounted.value = []
    searchQuery.value = ''
    activeCategoryId.value = null
    activeTab.value = 'best-sellers'
    offset.value = 0
    hasMore.value = false
    totalCount.value = 0
    offlineCachedProducts.value = []
    categoryProductsCache.clear()
    clearOfflineCache()
    invalidateCache()
  }

  // Update a product in all arrays (used when availability changes)
  function updateProduct(updatedProduct: Product) {
    const arrays = [products.value, allProducts.value, categoryProducts.value, bestSellers.value, favorites.value, discounted.value]
    for (const arr of arrays) {
      const index = arr.findIndex(p => p.id === updatedProduct.id)
      if (index !== -1) {
        arr[index] = updatedProduct
      }
    }
  }

  return {
    // State
    products,
    allProducts,
    categoryProducts,
    bestSellers,
    favorites,
    discounted,
    isLoading,
    isLoadingMore,
    searchQuery,
    activeCategoryId,
    activeTab,
    hasMore,
    totalCount,
    isOfflineMode,
    // Getters
    displayProducts,
    hasProducts,
    productCount,
    // Actions
    searchProducts,
    findByBarcode,
    loadBestSellers,
    loadFavorites,
    loadDiscounted,
    loadByCategory,
    loadAll,
    loadMore,
    setActiveTab,
    clearSearch,
    reset,
    updateProduct,
    invalidateCache,
  }
})
