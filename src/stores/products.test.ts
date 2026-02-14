import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductStore } from './products'
import type { Product } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockSearch = vi.fn()
const mockFindByBarcode = vi.fn()
const mockGetBestSellers = vi.fn()
const mockGetFavorites = vi.fn()
const mockGetDiscounted = vi.fn()
const mockGetByCategory = vi.fn()
const mockGetAll = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '', headers: { common: {} } } },
  productApi: {
    search: (...args: unknown[]) => mockSearch(...args),
    findByBarcode: (...args: unknown[]) => mockFindByBarcode(...args),
    getBestSellers: (...args: unknown[]) => mockGetBestSellers(...args),
    getFavorites: (...args: unknown[]) => mockGetFavorites(...args),
    getDiscounted: (...args: unknown[]) => mockGetDiscounted(...args),
    getByCategory: (...args: unknown[]) => mockGetByCategory(...args),
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
  authApi: {},
  customerApi: {},
  orderApi: {},
  categoryApi: {},
  promotionApi: {},
}))

let mockOnlineState = true
const mockGetOfflineProducts = vi.fn()
const mockCacheProductsForCustomer = vi.fn()

vi.mock('@/stores/offline', () => ({
  useOfflineStore: () => ({
    get isOnline() { return mockOnlineState },
    getOfflineProducts: mockGetOfflineProducts,
    cacheProductsForCustomer: mockCacheProductsForCustomer,
  }),
}))

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1, name: 'Test Product', sku: 'TP-001', barcode: null, barcode_box: null,
    image_url: null, base_price: 10, price_list_price: 10, price_list_discount: 0,
    price_list_discount_percent: 0, promotion_discount: 0, promotion_discount_percent: 0,
    customer_price: 10, total_discount: 0, total_discount_percent: 0, pricing_source: 'base',
    promotion_id: null, promotion_name: null, promotion_type: null, promotion_value: null,
    pieces_per_box: 12, piece_price: 10, box_price: 120, allow_broken_case: true,
    broken_case_discount: 0, broken_case_piece_price: 10,
    vat_rate: { id: 1, rate: 18 }, stock_quantity: 100,
    availability_status: 'in_stock', can_purchase: true, boxes_per_case: 1,
    moq_quantity: 1, moq_unit: 'piece', ...overrides,
  }
}

describe('useProductStore', () => {
  let store: ReturnType<typeof useProductStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnlineState = true
    setActivePinia(createPinia())
    store = useProductStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(store.products).toEqual([])
      expect(store.allProducts).toEqual([])
      expect(store.bestSellers).toEqual([])
      expect(store.favorites).toEqual([])
      expect(store.discounted).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.activeTab).toBe('best-sellers')
      expect(store.hasMore).toBe(false)
      expect(store.searchQuery).toBe('')
    })
  })

  describe('searchProducts', () => {
    it('searches and stores results', async () => {
      const products = [makeProduct({ id: 1 }), makeProduct({ id: 2, name: 'Product 2' })]
      mockSearch.mockResolvedValue({ products })

      await store.searchProducts('test', 1)

      expect(store.activeTab).toBe('search')
      expect(store.searchQuery).toBe('test')
      expect(store.products).toEqual(products)
      expect(store.isOfflineMode).toBe(false)
    })

    it('clears products for empty query', async () => {
      store.products = [makeProduct()]

      await store.searchProducts('', 1)

      expect(store.products).toEqual([])
      expect(mockSearch).not.toHaveBeenCalled()
    })

    it('clears products for whitespace-only query', async () => {
      await store.searchProducts('   ', 1)
      expect(store.products).toEqual([])
    })

    it('falls back to offline on error', async () => {
      const cachedProduct = {
        id: 1, name: 'Cached', sku: 'C-1', customer_id: 0,
        barcode: null, barcode_box: null, image_url: null,
        base_price: 5, box_price: 5, piece_price: 5,
        broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0,
        pieces_per_box: 1, allow_broken_case: false,
        vat_rate: null, category_id: null,
        availability_status: 'in_stock', can_purchase: true,
        allow_backorder: false, is_preorder: false, cached_at: Date.now(),
      }
      mockSearch.mockRejectedValue(new Error('Network'))
      mockGetOfflineProducts.mockResolvedValue([cachedProduct])

      await store.searchProducts('cached', 1)

      expect(store.isOfflineMode).toBe(true)
      expect(store.products.length).toBe(1)
    })

    it('clears products when offline fallback also fails', async () => {
      mockSearch.mockRejectedValue(new Error('Network'))
      mockGetOfflineProducts.mockRejectedValue(new Error('DB'))

      await store.searchProducts('test', 1)

      expect(store.products).toEqual([])
    })

    it('searches offline products directly when offline', async () => {
      mockOnlineState = false
      const cachedProduct = {
        id: 1, name: 'Test Offline', sku: 'TO-1', customer_id: 0,
        barcode: null, barcode_box: null, image_url: null,
        base_price: 5, box_price: 5, piece_price: 5,
        broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0,
        pieces_per_box: 1, allow_broken_case: false,
        vat_rate: null, category_id: null,
        availability_status: 'in_stock', can_purchase: true,
        allow_backorder: false, is_preorder: false, cached_at: Date.now(),
      }
      mockGetOfflineProducts.mockResolvedValue([cachedProduct])

      await store.searchProducts('test', 1)

      expect(store.isOfflineMode).toBe(true)
      expect(store.products.length).toBe(1)
      expect(mockSearch).not.toHaveBeenCalled()
    })
  })

  describe('findByBarcode', () => {
    it('returns product data on success', async () => {
      const response = { success: true, product: makeProduct() }
      mockFindByBarcode.mockResolvedValue(response)

      const result = await store.findByBarcode('123456', 1)

      expect(mockFindByBarcode).toHaveBeenCalledWith('123456', 1)
      expect(result).toEqual(response)
    })

    it('returns error response on failure', async () => {
      mockFindByBarcode.mockRejectedValue(new Error('Not found'))

      const result = await store.findByBarcode('invalid', 1)

      expect(result).toEqual({ success: false, message: 'Product not found' })
    })
  })

  describe('loadBestSellers', () => {
    it('loads best sellers from API', async () => {
      const products = [makeProduct({ id: 10 })]
      mockGetBestSellers.mockResolvedValue({ products })

      await store.loadBestSellers(1)

      expect(store.activeTab).toBe('best-sellers')
      expect(store.bestSellers).toEqual(products)
      expect(store.isOfflineMode).toBe(false)
    })

    it('caches products for offline', async () => {
      const products = [makeProduct()]
      mockGetBestSellers.mockResolvedValue({ products })

      await store.loadBestSellers(1)

      expect(mockCacheProductsForCustomer).toHaveBeenCalledWith(products, 1)
    })

    it('uses cached data on repeat call', async () => {
      const products = [makeProduct()]
      mockGetBestSellers.mockResolvedValue({ products })

      await store.loadBestSellers(1)
      await store.loadBestSellers(1)

      expect(mockGetBestSellers).toHaveBeenCalledTimes(1)
    })

    it('forces refresh when requested', async () => {
      const products = [makeProduct()]
      mockGetBestSellers.mockResolvedValue({ products })

      await store.loadBestSellers(1)
      await store.loadBestSellers(1, true)

      expect(mockGetBestSellers).toHaveBeenCalledTimes(2)
    })

    it('refetches for different customer', async () => {
      const products = [makeProduct()]
      mockGetBestSellers.mockResolvedValue({ products })

      await store.loadBestSellers(1)
      await store.loadBestSellers(2)

      expect(mockGetBestSellers).toHaveBeenCalledTimes(2)
    })

    it('uses offline cache when offline', async () => {
      mockOnlineState = false
      const cached = [{ id: 1, name: 'Cached', sku: 'C-1', customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: null, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }]
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadBestSellers(1)

      expect(store.isOfflineMode).toBe(true)
      expect(store.bestSellers.length).toBeGreaterThan(0)
    })

    it('falls back to offline cache when API errors', async () => {
      mockOnlineState = true
      mockGetBestSellers.mockRejectedValue(new Error('Server error'))
      const cached = [{ id: 1, name: 'Cached', sku: 'C-1', customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: null, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }]
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadBestSellers(1)

      expect(store.isOfflineMode).toBe(true)
      expect(store.bestSellers.length).toBeGreaterThan(0)
    })

    it('clears bestSellers when API errors and offline cache returns empty', async () => {
      mockOnlineState = true
      mockGetBestSellers.mockRejectedValue(new Error('Server error'))
      mockGetOfflineProducts.mockResolvedValue([])

      await store.loadBestSellers(1)

      expect(store.bestSellers).toEqual([])
    })

    it('clears bestSellers when API errors and offline cache also fails', async () => {
      mockOnlineState = true
      mockGetBestSellers.mockRejectedValue(new Error('Server error'))
      mockGetOfflineProducts.mockRejectedValue(new Error('IndexedDB error'))

      await store.loadBestSellers(1)

      expect(store.bestSellers).toEqual([])
    })
  })

  describe('loadFavorites', () => {
    it('loads favorites from API', async () => {
      const products = [makeProduct({ id: 20 })]
      mockGetFavorites.mockResolvedValue({ products })

      await store.loadFavorites(1)

      expect(store.activeTab).toBe('favorites')
      expect(store.favorites).toEqual(products)
    })

    it('clears favorites on error', async () => {
      mockGetFavorites.mockRejectedValue(new Error('Error'))

      await store.loadFavorites(1)

      expect(store.favorites).toEqual([])
    })

    it('uses cache on repeat call', async () => {
      mockGetFavorites.mockResolvedValue({ products: [makeProduct()] })

      await store.loadFavorites(1)
      await store.loadFavorites(1)

      expect(mockGetFavorites).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadDiscounted', () => {
    it('loads discounted products', async () => {
      const products = [makeProduct({ id: 30 })]
      mockGetDiscounted.mockResolvedValue({ products })

      await store.loadDiscounted(1)

      expect(store.activeTab).toBe('discounted')
      expect(store.discounted).toEqual(products)
    })

    it('clears on error', async () => {
      mockGetDiscounted.mockRejectedValue(new Error('Error'))

      await store.loadDiscounted(1)

      expect(store.discounted).toEqual([])
    })

    it('uses cache on repeat call', async () => {
      mockGetDiscounted.mockResolvedValue({ products: [makeProduct()] })

      await store.loadDiscounted(1)
      await store.loadDiscounted(1)

      expect(mockGetDiscounted).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadByCategory', () => {
    it('loads products by category', async () => {
      const products = [makeProduct({ id: 40, category_id: 5 })]
      mockGetByCategory.mockResolvedValue({ products, hasMore: false, total: 1 })

      await store.loadByCategory(1, 5)

      expect(store.activeTab).toBe('category')
      expect(store.activeCategoryId).toBe(5)
      expect(store.categoryProducts).toEqual(products)
      expect(store.hasMore).toBe(false)
    })

    it('caches per-category results', async () => {
      const products = [makeProduct()]
      mockGetByCategory.mockResolvedValue({ products, hasMore: false, total: 1 })

      await store.loadByCategory(1, 5)
      await store.loadByCategory(1, 5)

      expect(mockGetByCategory).toHaveBeenCalledTimes(1)
    })

    it('fetches different categories independently', async () => {
      mockGetByCategory.mockResolvedValue({ products: [makeProduct()], hasMore: false, total: 1 })

      await store.loadByCategory(1, 5)
      await store.loadByCategory(1, 10)

      expect(mockGetByCategory).toHaveBeenCalledTimes(2)
    })

    it('uses offline cache when offline', async () => {
      mockOnlineState = false
      const cached = [{ id: 1, name: 'Cat Product', sku: 'CP-1', customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: 5, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }]
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadByCategory(1, 5)

      expect(store.isOfflineMode).toBe(true)
      expect(store.categoryProducts.length).toBe(1)
    })

    it('falls back to offline cache when API errors', async () => {
      mockOnlineState = true
      mockGetByCategory.mockRejectedValue(new Error('Server error'))
      const cached = [{ id: 1, name: 'Cat Product', sku: 'CP-1', customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: 5, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }]
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadByCategory(1, 5)

      expect(store.isOfflineMode).toBe(true)
      expect(store.categoryProducts.length).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('clears products when API errors and offline cache also fails', async () => {
      mockOnlineState = true
      mockGetByCategory.mockRejectedValue(new Error('Server error'))
      mockGetOfflineProducts.mockRejectedValue(new Error('IndexedDB error'))

      await store.loadByCategory(1, 5)

      expect(store.categoryProducts).toEqual([])
      expect(store.hasMore).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('loadAll', () => {
    it('loads all products with pagination info', async () => {
      const products = [makeProduct({ id: 50 })]
      mockGetAll.mockResolvedValue({ products, hasMore: true, total: 100 })

      await store.loadAll(1)

      expect(store.activeTab).toBe('all')
      expect(store.allProducts).toEqual(products)
      expect(store.hasMore).toBe(true)
      expect(store.totalCount).toBe(100)
    })

    it('uses cache on repeat call', async () => {
      mockGetAll.mockResolvedValue({ products: [makeProduct()], hasMore: false, total: 1 })

      await store.loadAll(1)
      await store.loadAll(1)

      expect(mockGetAll).toHaveBeenCalledTimes(1)
    })

    it('uses offline cache when offline', async () => {
      mockOnlineState = false
      const cached = Array.from({ length: 60 }, (_, i) => ({ id: i, name: `P${i}`, sku: `S${i}`, customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: null, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }))
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadAll(1)

      expect(store.isOfflineMode).toBe(true)
      expect(store.allProducts.length).toBe(60) // all products shown at once offline
      expect(store.hasMore).toBe(false)
    })

    it('falls back to offline cache when API errors', async () => {
      mockOnlineState = true
      mockGetAll.mockRejectedValue(new Error('Server error'))
      const cached = Array.from({ length: 60 }, (_, i) => ({ id: i, name: `P${i}`, sku: `S${i}`, customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: null, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }))
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadAll(1)

      expect(store.isOfflineMode).toBe(true)
      expect(store.allProducts.length).toBe(60)
      expect(store.hasMore).toBe(false)
      expect(store.totalCount).toBe(60)
      expect(store.isLoading).toBe(false)
    })

    it('clears products when API errors and offline cache returns empty', async () => {
      mockOnlineState = true
      mockGetAll.mockRejectedValue(new Error('Server error'))
      mockGetOfflineProducts.mockResolvedValue([])

      await store.loadAll(1)

      expect(store.allProducts).toEqual([])
      expect(store.hasMore).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('clears products when API errors and offline cache also fails', async () => {
      mockOnlineState = true
      mockGetAll.mockRejectedValue(new Error('Server error'))
      mockGetOfflineProducts.mockRejectedValue(new Error('IndexedDB error'))

      await store.loadAll(1)

      expect(store.allProducts).toEqual([])
      expect(store.hasMore).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('loadMore', () => {
    it('loads next batch of all products', async () => {
      const products = [makeProduct({ id: 51 })]
      mockGetAll.mockResolvedValue({ products, hasMore: false })

      store.$patch({ activeTab: 'all', hasMore: true, isLoadingMore: false, isLoading: false })
      await store.loadMore(1)

      expect(store.allProducts).toContainEqual(products[0])
    })

    it('does nothing when no more pages', async () => {
      store.$patch({ hasMore: false })

      await store.loadMore(1)

      expect(mockGetAll).not.toHaveBeenCalled()
    })

    it('does nothing when already loading', async () => {
      store.$patch({ hasMore: true, isLoadingMore: true })

      await store.loadMore(1)

      expect(mockGetAll).not.toHaveBeenCalled()
    })

    it('does nothing when isLoading is true', async () => {
      store.$patch({ hasMore: true, isLoadingMore: false, isLoading: true })

      await store.loadMore(1)

      expect(mockGetAll).not.toHaveBeenCalled()
    })

    it('loads more category products', async () => {
      const products = [makeProduct({ id: 60 })]
      mockGetByCategory.mockResolvedValue({ products, hasMore: false })

      store.$patch({
        activeTab: 'category',
        activeCategoryId: 5,
        hasMore: true,
        isLoadingMore: false,
        isLoading: false,
      })

      await store.loadMore(1)

      expect(mockGetByCategory).toHaveBeenCalledWith(1, 5, 50, 50)
      expect(store.categoryProducts).toContainEqual(products[0])
    })

    it('returns early for tabs that do not support pagination', async () => {
      store.$patch({
        activeTab: 'best-sellers',
        hasMore: true,
        isLoadingMore: false,
        isLoading: false,
      })

      await store.loadMore(1)

      expect(mockGetAll).not.toHaveBeenCalled()
      expect(mockGetByCategory).not.toHaveBeenCalled()
    })

    it('handles loadMore API error gracefully', async () => {
      mockGetAll.mockRejectedValue(new Error('Network error'))

      store.$patch({
        activeTab: 'all',
        hasMore: true,
        isLoadingMore: false,
        isLoading: false,
      })

      await store.loadMore(1)

      expect(store.isLoadingMore).toBe(false)
    })

    it('shows all offline cached products at once for all tab (no pagination)', async () => {
      mockOnlineState = false
      const cached = Array.from({ length: 80 }, (_, i) => ({ id: i, name: `P${i}`, sku: `S${i}`, customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: null, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }))
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadAll(1)
      expect(store.allProducts.length).toBe(80)
      expect(store.hasMore).toBe(false)
      expect(store.isOfflineMode).toBe(true)
    })

    it('shows all offline cached products at once for category tab (no pagination)', async () => {
      mockOnlineState = false
      const cached = Array.from({ length: 80 }, (_, i) => ({ id: i, name: `P${i}`, sku: `S${i}`, customer_id: 0, barcode: null, barcode_box: null, image_url: null, base_price: 5, box_price: 5, piece_price: 5, broken_case_piece_price: 5, total_discount: 0, total_discount_percent: 0, pieces_per_box: 1, allow_broken_case: false, vat_rate: null, category_id: 5, availability_status: 'in_stock', can_purchase: true, allow_backorder: false, is_preorder: false, cached_at: Date.now() }))
      mockGetOfflineProducts.mockResolvedValue(cached)

      await store.loadByCategory(1, 5)
      expect(store.categoryProducts.length).toBe(80)
      expect(store.hasMore).toBe(false)
      expect(store.isOfflineMode).toBe(true)
    })
  })

  describe('displayProducts (computed)', () => {
    it('returns search products for search tab', () => {
      const p = makeProduct({ id: 1, can_purchase: true })
      store.products = [p]
      store.setActiveTab('search')
      expect(store.displayProducts).toEqual([p])
    })

    it('returns all products for all tab', () => {
      const p = makeProduct({ id: 2, can_purchase: true })
      store.allProducts = [p]
      store.setActiveTab('all')
      expect(store.displayProducts).toEqual([p])
    })

    it('returns best sellers for best-sellers tab', () => {
      const p = makeProduct({ id: 3, can_purchase: true })
      store.bestSellers = [p]
      store.setActiveTab('best-sellers')
      expect(store.displayProducts).toEqual([p])
    })

    it('sorts in-stock products first', () => {
      const inStock = makeProduct({ id: 1, can_purchase: true })
      const outOfStock = makeProduct({ id: 2, can_purchase: false })
      store.products = [outOfStock, inStock]
      store.setActiveTab('search')
      expect(store.displayProducts[0].id).toBe(1)
    })

    it('returns favorites for favorites tab', () => {
      const p = makeProduct({ id: 4, can_purchase: true })
      store.favorites = [p]
      store.setActiveTab('favorites')
      expect(store.displayProducts).toEqual([p])
    })

    it('returns discounted for discounted tab', () => {
      const p = makeProduct({ id: 5, can_purchase: true })
      store.discounted = [p]
      store.setActiveTab('discounted')
      expect(store.displayProducts).toEqual([p])
    })

    it('returns category products for category tab', () => {
      const p = makeProduct({ id: 6, can_purchase: true })
      store.categoryProducts = [p]
      store.setActiveTab('category')
      expect(store.displayProducts).toEqual([p])
    })

    it('sorts products with equal availability to 0', () => {
      const a = makeProduct({ id: 10, name: 'Alpha', can_purchase: false })
      const b = makeProduct({ id: 11, name: 'Beta', can_purchase: false })
      store.products = [a, b]
      store.setActiveTab('search')
      // Both are non-purchasable, sort comparator returns 0, order is preserved
      expect(store.displayProducts[0].id).toBe(10)
      expect(store.displayProducts[1].id).toBe(11)
    })
  })

  describe('updateProduct', () => {
    it('updates product across all arrays', () => {
      const original = makeProduct({ id: 1, name: 'Original' })
      const updated = makeProduct({ id: 1, name: 'Updated' })

      store.products = [original]
      store.allProducts = [original]
      store.bestSellers = [original]

      store.updateProduct(updated)

      expect(store.products[0].name).toBe('Updated')
      expect(store.allProducts[0].name).toBe('Updated')
      expect(store.bestSellers[0].name).toBe('Updated')
    })

    it('does nothing for non-existent product', () => {
      const existing = makeProduct({ id: 1, name: 'Existing' })
      store.products = [existing]

      store.updateProduct(makeProduct({ id: 999, name: 'New' }))

      expect(store.products[0].name).toBe('Existing')
    })
  })

  describe('clearSearch', () => {
    it('clears search query and products', () => {
      store.searchQuery = 'test'
      store.products = [makeProduct()]

      store.clearSearch()

      expect(store.searchQuery).toBe('')
      expect(store.products).toEqual([])
    })
  })

  describe('reset', () => {
    it('resets all state to defaults', () => {
      store.$patch({
        products: [makeProduct()],
        allProducts: [makeProduct()],
        bestSellers: [makeProduct()],
        favorites: [makeProduct()],
        discounted: [makeProduct()],
        searchQuery: 'test',
        activeTab: 'all',
        hasMore: true,
        totalCount: 100,
      })

      store.reset()

      expect(store.products).toEqual([])
      expect(store.allProducts).toEqual([])
      expect(store.bestSellers).toEqual([])
      expect(store.favorites).toEqual([])
      expect(store.discounted).toEqual([])
      expect(store.searchQuery).toBe('')
      expect(store.activeTab).toBe('best-sellers')
      expect(store.hasMore).toBe(false)
      expect(store.totalCount).toBe(0)
    })
  })

  describe('setActiveTab', () => {
    it('sets the active tab', () => {
      store.setActiveTab('favorites')
      expect(store.activeTab).toBe('favorites')
    })
  })

  describe('invalidateCache', () => {
    it('invalidates specific tab cache', async () => {
      mockGetBestSellers.mockResolvedValue({ products: [makeProduct()] })

      await store.loadBestSellers(1)
      store.invalidateCache('best-sellers')
      await store.loadBestSellers(1)

      expect(mockGetBestSellers).toHaveBeenCalledTimes(2)
    })

    it('invalidates all caches when no tab specified', async () => {
      mockGetBestSellers.mockResolvedValue({ products: [makeProduct()] })
      mockGetFavorites.mockResolvedValue({ products: [makeProduct()] })

      await store.loadBestSellers(1)
      await store.loadFavorites(1)
      store.invalidateCache()
      await store.loadBestSellers(1)
      await store.loadFavorites(1)

      expect(mockGetBestSellers).toHaveBeenCalledTimes(2)
      expect(mockGetFavorites).toHaveBeenCalledTimes(2)
    })
  })
})
