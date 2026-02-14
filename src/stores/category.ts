import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoryApi } from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import type { Category } from '@/types'
import { logger } from '@/utils/logger'

export const useCategoryStore = defineStore('category', () => {
  // State
  const categories = ref<Category[]>([])
  const isLoading = ref(false)
  const selectedCategoryId = ref<number | null>(null)

  // Getters
  const selectedCategory = computed(() =>
    categories.value.find(c => c.id === selectedCategoryId.value) || null
  )

  const totalProductCount = computed(() =>
    categories.value.reduce((sum, cat) => sum + cat.product_count, 0)
  )

  // Actions
  async function fetchCategories() {
    isLoading.value = true
    const offlineStore = useOfflineStore()
    try {
      const response = await categoryApi.list(true) // parents only
      categories.value = response.categories || []
      // Cache for offline use
      if (categories.value.length > 0) {
        offlineStore.cacheCategoryList(categories.value)
      }
    } catch (error) {
      logger.error('Failed to fetch categories:', error)
      // Fallback to offline cache
      try {
        const cached = await offlineStore.getOfflineCategories()
        if (cached.length > 0) {
          categories.value = cached as unknown as Category[]
        } else {
          categories.value = []
        }
      } catch {
        categories.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  function selectCategory(categoryId: number | null) {
    selectedCategoryId.value = categoryId
  }

  function reset() {
    categories.value = []
    selectedCategoryId.value = null
  }

  return {
    // State
    categories,
    isLoading,
    selectedCategoryId,
    // Getters
    selectedCategory,
    totalProductCount,
    // Actions
    fetchCategories,
    selectCategory,
    reset,
  }
})
