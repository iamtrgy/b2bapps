import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { categoryApi } from '@/services/api'
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
    try {
      const response = await categoryApi.list(true) // parents only
      categories.value = response.categories || []
    } catch (error) {
      logger.error('Failed to fetch categories:', error)
      categories.value = []
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
