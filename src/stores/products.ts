import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productApi } from '@/services/api'
import type { Product } from '@/types'

const PAGE_SIZE = 50

export const useProductStore = defineStore('products', () => {
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

  // Getters
  const displayProducts = computed(() => {
    let items: Product[]
    switch (activeTab.value) {
      case 'all':
        items = allProducts.value
        break
      case 'category':
        items = categoryProducts.value
        break
      case 'best-sellers':
        items = bestSellers.value
        break
      case 'favorites':
        items = favorites.value
        break
      case 'discounted':
        items = discounted.value
        break
      default:
        items = products.value
    }
    return sortByAvailability(items)
  })

  const hasProducts = computed(() => displayProducts.value.length > 0)
  const productCount = computed(() => displayProducts.value.length)

  // Actions
  async function searchProducts(query: string, customerId: number) {
    searchQuery.value = query
    activeTab.value = 'search'

    if (!query.trim()) {
      products.value = []
      return
    }

    isLoading.value = true
    try {
      const response = await productApi.search(query, customerId)
      products.value = response.products
    } catch (error) {
      console.error('Failed to search products:', error)
      products.value = []
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
      console.error('Failed to find product by barcode:', error)
      return { success: false, message: 'Product not found' }
    } finally {
      isLoading.value = false
    }
  }

  async function loadBestSellers(customerId: number) {
    activeTab.value = 'best-sellers'
    isLoading.value = true
    try {
      const response = await productApi.getBestSellers(customerId)
      bestSellers.value = response.products
    } catch (error) {
      console.error('Failed to load best sellers:', error)
      bestSellers.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function loadFavorites(customerId: number) {
    activeTab.value = 'favorites'
    isLoading.value = true
    try {
      const response = await productApi.getFavorites(customerId)
      favorites.value = response.products
    } catch (error) {
      console.error('Failed to load favorites:', error)
      favorites.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function loadDiscounted(customerId: number) {
    activeTab.value = 'discounted'
    isLoading.value = true
    try {
      const response = await productApi.getDiscounted(customerId)
      discounted.value = response.products
    } catch (error) {
      console.error('Failed to load discounted products:', error)
      discounted.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function loadByCategory(customerId: number, categoryId: number) {
    activeTab.value = 'category'
    activeCategoryId.value = categoryId
    offset.value = 0
    isLoading.value = true
    try {
      const response = await productApi.getByCategory(customerId, categoryId, PAGE_SIZE, 0)
      categoryProducts.value = response.products
      hasMore.value = response.hasMore ?? false
      totalCount.value = response.total ?? 0
    } catch (error) {
      console.error('Failed to load category products:', error)
      categoryProducts.value = []
      hasMore.value = false
    } finally {
      isLoading.value = false
    }
  }

  async function loadAll(customerId: number) {
    activeTab.value = 'all'
    offset.value = 0
    isLoading.value = true
    try {
      const response = await productApi.getAll(customerId, PAGE_SIZE, 0)
      allProducts.value = response.products
      hasMore.value = response.hasMore ?? false
      totalCount.value = response.total ?? 0
    } catch (error) {
      console.error('Failed to load all products:', error)
      allProducts.value = []
      hasMore.value = false
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
      let response
      if (activeTab.value === 'all') {
        response = await productApi.getAll(customerId, PAGE_SIZE, newOffset)
        allProducts.value = [...allProducts.value, ...response.products]
      } else if (activeTab.value === 'category' && activeCategoryId.value) {
        response = await productApi.getByCategory(customerId, activeCategoryId.value, PAGE_SIZE, newOffset)
        categoryProducts.value = [...categoryProducts.value, ...response.products]
      } else {
        return // Other tabs don't support pagination
      }

      offset.value = newOffset
      hasMore.value = response.hasMore ?? false
    } catch (error) {
      console.error('Failed to load more products:', error)
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
  }

  // Update a product in all arrays (used when availability changes)
  function updateProduct(updatedProduct: Product) {
    const updateInArray = (arr: Product[]) => {
      const index = arr.findIndex(p => p.id === updatedProduct.id)
      if (index !== -1) {
        arr[index] = updatedProduct
      }
    }

    updateInArray(products.value)
    updateInArray(allProducts.value)
    updateInArray(categoryProducts.value)
    updateInArray(bestSellers.value)
    updateInArray(favorites.value)
    updateInArray(discounted.value)
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
  }
})
