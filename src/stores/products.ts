import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productApi } from '@/services/api'
import type { Product } from '@/types'

export const useProductStore = defineStore('products', () => {
  // State
  const products = ref<Product[]>([])
  const bestSellers = ref<Product[]>([])
  const favorites = ref<Product[]>([])
  const discounted = ref<Product[]>([])
  const isLoading = ref(false)
  const searchQuery = ref('')
  const activeTab = ref<'search' | 'best-sellers' | 'favorites' | 'discounted'>('search')

  // Getters
  const displayProducts = computed(() => {
    switch (activeTab.value) {
      case 'best-sellers':
        return bestSellers.value
      case 'favorites':
        return favorites.value
      case 'discounted':
        return discounted.value
      default:
        return products.value
    }
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

  function setActiveTab(tab: 'search' | 'best-sellers' | 'favorites' | 'discounted') {
    activeTab.value = tab
  }

  function clearSearch() {
    searchQuery.value = ''
    products.value = []
  }

  function reset() {
    products.value = []
    bestSellers.value = []
    favorites.value = []
    discounted.value = []
    searchQuery.value = ''
    activeTab.value = 'search'
  }

  return {
    // State
    products,
    bestSellers,
    favorites,
    discounted,
    isLoading,
    searchQuery,
    activeTab,
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
    setActiveTab,
    clearSearch,
    reset,
  }
})
