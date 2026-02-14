import { ref, onUnmounted, type Ref } from 'vue'
import { useProductStore } from '@/stores/products'
import type { Customer } from '@/types'

export function useProductBrowsing(selectedCustomer: Ref<Customer | null>) {
  const productStore = useProductStore()
  const searchQuery = ref('')
  const activeCategoryTab = ref<'search' | 'all' | 'best-sellers' | 'favorites' | 'discounted' | number>('best-sellers')
  const productGridRef = ref<HTMLElement | null>(null)

  let scrollTicking = false
  let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null

  function handleProductScroll(event: Event) {
    if (scrollTicking) return
    scrollTicking = true
    requestAnimationFrame(() => {
      const target = event.target as HTMLElement
      const { scrollTop, scrollHeight, clientHeight } = target

      if (scrollHeight - scrollTop - clientHeight < 200) {
        if (selectedCustomer.value && productStore.hasMore && !productStore.isLoadingMore) {
          productStore.loadMore(selectedCustomer.value.id)
        }
      }
      scrollTicking = false
    })
  }

  function handleSearchFocus(e: FocusEvent) {
    const el = e.target as HTMLInputElement
    el.select()
    el.addEventListener('mouseup', (m) => m.preventDefault(), { once: true })
  }

  function handleCategoryWheel(e: WheelEvent) {
    ;(e.currentTarget as HTMLElement).scrollLeft += e.deltaY
  }

  function handleCategorySelect(tab: 'all' | 'best-sellers' | 'favorites' | 'discounted' | number) {
    activeCategoryTab.value = tab
    searchQuery.value = ''

    if (!selectedCustomer.value) return

    if (tab === 'all') {
      productStore.loadAll(selectedCustomer.value.id)
    } else if (tab === 'best-sellers') {
      productStore.loadBestSellers(selectedCustomer.value.id)
    } else if (tab === 'favorites') {
      productStore.loadFavorites(selectedCustomer.value.id)
    } else if (tab === 'discounted') {
      productStore.loadDiscounted(selectedCustomer.value.id)
    } else {
      productStore.loadByCategory(selectedCustomer.value.id, tab)
    }
  }

  function handleSearchInput() {
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout)
    }
    searchDebounceTimeout = setTimeout(() => {
      handleSearch(searchQuery.value)
    }, 300)
  }

  function handleSearch(query: string) {
    if (!selectedCustomer.value) return
    activeCategoryTab.value = 'search'
    productStore.searchProducts(query, selectedCustomer.value.id)
  }

  onUnmounted(() => {
    if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout)
  })

  return {
    searchQuery,
    activeCategoryTab,
    productGridRef,
    handleProductScroll,
    handleSearchFocus,
    handleCategoryWheel,
    handleCategorySelect,
    handleSearchInput,
    handleSearch,
  }
}
