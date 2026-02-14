import { ref, watch, onUnmounted } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useProductStore } from '@/stores/products'
import { useCustomerStore } from '@/stores/customer'
import { useCategoryStore } from '@/stores/category'
import { customerApi } from '@/services/api'
import type { Customer } from '@/types'
import { logger } from '@/utils/logger'

const CUSTOMER_STORAGE_KEY = 'pos_selected_customer'

export function useCustomerSelection() {
  const cartStore = useCartStore()
  const productStore = useProductStore()
  const customerStore = useCustomerStore()
  const categoryStore = useCategoryStore()

  const selectedCustomer = ref<Customer | null>(null)
  const customerSearchQuery = ref('')
  const showCustomerDetail = ref(false)
  const customerDetailTab = ref('info')
  const customerDetail = ref<Customer | null>(null)

  let customerSearchTimeout: ReturnType<typeof setTimeout> | null = null

  // When customer changes, initialize stores
  watch(selectedCustomer, (customer) => {
    if (customer) {
      cartStore.setCustomer(customer)
      Promise.all([
        categoryStore.fetchCategories(),
        productStore.loadBestSellers(customer.id),
      ]).catch((error) => {
        logger.error('Failed to initialize stores for customer:', error)
      })
    }
  })

  function handleCustomerSelect(customer: Customer) {
    selectedCustomer.value = customer
    saveCustomerToStorage(customer)
  }

  async function openCustomerDetail() {
    if (!selectedCustomer.value) return
    customerDetail.value = selectedCustomer.value
    customerDetailTab.value = 'info'
    showCustomerDetail.value = true

    try {
      const fullData = await customerApi.get(selectedCustomer.value.id)
      customerDetail.value = fullData
    } catch (error) {
      logger.error('Failed to fetch customer detail:', error)
    }
  }

  function clearCustomer() {
    if (cartStore.editingOrderId || cartStore.returnMode) return
    selectedCustomer.value = null
    saveCustomerToStorage(null)
    productStore.reset()
    cartStore.clear()
  }

  function handleCustomerSearch() {
    if (customerSearchTimeout) {
      clearTimeout(customerSearchTimeout)
    }
    customerSearchTimeout = setTimeout(() => {
      customerStore.searchCustomers(customerSearchQuery.value)
    }, 300)
  }

  function saveCustomerToStorage(customer: Customer | null) {
    if (customer) {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer))
    } else {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY)
    }
  }

  function loadCustomerFromStorage(): Customer | null {
    const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  }

  onUnmounted(() => {
    if (customerSearchTimeout) clearTimeout(customerSearchTimeout)
  })

  return {
    selectedCustomer,
    customerSearchQuery,
    showCustomerDetail,
    customerDetailTab,
    customerDetail,
    handleCustomerSelect,
    openCustomerDetail,
    clearCustomer,
    handleCustomerSearch,
    saveCustomerToStorage,
    loadCustomerFromStorage,
  }
}
