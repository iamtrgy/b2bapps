import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCategoryStore } from './category'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockCategoryList = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  categoryApi: {
    list: (...args: unknown[]) => mockCategoryList(...args),
  },
  authApi: {},
  customerApi: {},
  orderApi: {},
  productApi: {},
  promotionApi: {},
}))

const sampleCategories = [
  { id: 1, name: 'Meyve', slug: 'meyve', product_count: 25 },
  { id: 2, name: 'Sebze', slug: 'sebze', product_count: 15 },
  { id: 3, name: 'İçecek', slug: 'icecek', product_count: 30 },
]

describe('useCategoryStore', () => {
  let store: ReturnType<typeof useCategoryStore>

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useCategoryStore()
  })

  describe('initial state', () => {
    it('starts with empty categories', () => {
      expect(store.categories).toEqual([])
    })

    it('starts not loading', () => {
      expect(store.isLoading).toBe(false)
    })

    it('starts with no selected category', () => {
      expect(store.selectedCategoryId).toBeNull()
    })
  })

  describe('fetchCategories', () => {
    it('loads categories from API', async () => {
      mockCategoryList.mockResolvedValue({ categories: sampleCategories })

      await store.fetchCategories()

      expect(mockCategoryList).toHaveBeenCalledWith(true)
      expect(store.categories).toEqual(sampleCategories)
      expect(store.isLoading).toBe(false)
    })

    it('sets isLoading during fetch', async () => {
      mockCategoryList.mockImplementation(() => {
        expect(store.isLoading).toBe(true)
        return Promise.resolve({ categories: sampleCategories })
      })

      await store.fetchCategories()
      expect(store.isLoading).toBe(false)
    })

    it('clears categories on API error', async () => {
      store.categories = sampleCategories as any
      mockCategoryList.mockRejectedValue(new Error('Network error'))

      await store.fetchCategories()

      expect(store.categories).toEqual([])
      expect(store.isLoading).toBe(false)
    })

    it('handles missing categories in response', async () => {
      mockCategoryList.mockResolvedValue({})

      await store.fetchCategories()

      expect(store.categories).toEqual([])
    })
  })

  describe('selectCategory', () => {
    it('sets selected category id', () => {
      store.selectCategory(2)
      expect(store.selectedCategoryId).toBe(2)
    })

    it('clears selection with null', () => {
      store.selectCategory(2)
      store.selectCategory(null)
      expect(store.selectedCategoryId).toBeNull()
    })
  })

  describe('selectedCategory (computed)', () => {
    it('returns the matching category', () => {
      store.categories = sampleCategories as any
      store.selectCategory(2)
      expect(store.selectedCategory).toEqual(sampleCategories[1])
    })

    it('returns null if no match', () => {
      store.categories = sampleCategories as any
      store.selectCategory(999)
      expect(store.selectedCategory).toBeNull()
    })

    it('returns null if nothing selected', () => {
      store.categories = sampleCategories as any
      expect(store.selectedCategory).toBeNull()
    })
  })

  describe('totalProductCount (computed)', () => {
    it('sums product_count across all categories', () => {
      store.categories = sampleCategories as any
      expect(store.totalProductCount).toBe(70)
    })

    it('returns 0 for empty categories', () => {
      expect(store.totalProductCount).toBe(0)
    })
  })

  describe('reset', () => {
    it('clears categories and selection', () => {
      store.categories = sampleCategories as any
      store.selectCategory(1)

      store.reset()

      expect(store.categories).toEqual([])
      expect(store.selectedCategoryId).toBeNull()
    })
  })
})
