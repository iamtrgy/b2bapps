import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { customerApi } from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import type { Customer } from '@/types'
import type { CachedCustomer } from '@/services/db'
import { logger } from '@/utils/logger'

/** Map a CachedCustomer (from IndexedDB) to the Customer shape with safe defaults */
function cachedToCustomer(c: CachedCustomer): Customer {
  return {
    id: c.id,
    afas_debtor_id: c.afas_debtor_id,
    company_name: c.company_name,
    contact_name: c.contact_name ?? '',
    contact_email: c.contact_email ?? '',
    contact_phone: c.contact_phone ?? '',
    customer_tier: (c.customer_tier as Customer['customer_tier']) || 'bronze',
  }
}

export const useCustomerStore = defineStore('customer', () => {
  // State
  const customers = ref<Customer[]>([])
  const selectedCustomer = ref<Customer | null>(null)
  const isLoading = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const lastPage = ref(1)
  const total = ref(0)
  const isOfflineMode = ref(false)

  // Getters
  const hasMore = computed(() => currentPage.value < lastPage.value)

  // Shared offline customer search helper
  async function filterOfflineCustomers(search?: string): Promise<Customer[]> {
    const offlineStore = useOfflineStore()
    const cachedCustomers = await offlineStore.getOfflineCustomers()
    if (search) {
      const searchLower = search.toLowerCase()
      return cachedCustomers.filter(c =>
        c.company_name.toLowerCase().includes(searchLower) ||
        c.contact_name?.toLowerCase().includes(searchLower) ||
        c.contact_email?.toLowerCase().includes(searchLower) ||
        c.afas_debtor_id?.toLowerCase().includes(searchLower)
      ).map(cachedToCustomer)
    }
    return cachedCustomers.map(cachedToCustomer)
  }

  // Actions
  async function fetchCustomers(page = 1, search?: string) {
    isLoading.value = true
    const offlineStore = useOfflineStore()

    try {
      if (offlineStore.isOnline) {
        const response = await customerApi.list(page, search)

        if (page === 1) {
          customers.value = response.data
        } else {
          customers.value = [...customers.value, ...response.data]
        }

        currentPage.value = response.meta.current_page
        lastPage.value = response.meta.last_page
        total.value = response.meta.total
        isOfflineMode.value = false

        if (page === 1 && !search) {
          offlineStore.cacheCustomerList(response.data)
        }
      } else {
        customers.value = await filterOfflineCustomers(search)
        currentPage.value = 1
        lastPage.value = 1
        total.value = customers.value.length
        isOfflineMode.value = true
      }
    } catch (error) {
      logger.error('Failed to fetch customers:', error)
      try {
        customers.value = await filterOfflineCustomers(search)
        isOfflineMode.value = true
      } catch {
        customers.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  async function searchCustomers(query: string) {
    searchQuery.value = query
    await fetchCustomers(1, query)
  }

  async function loadMore() {
    if (hasMore.value && !isLoading.value) {
      await fetchCustomers(currentPage.value + 1, searchQuery.value || undefined)
    }
  }

  async function selectCustomer(customer: Customer) {
    selectedCustomer.value = customer
  }

  async function selectCustomerById(id: number) {
    // Check if already in list
    let customer = customers.value.find((c) => c.id === id)

    if (!customer) {
      // Fetch from API
      try {
        customer = await customerApi.get(id)
      } catch (error) {
        logger.error('Failed to fetch customer:', error)
        throw error
      }
    }

    selectedCustomer.value = customer
  }

  function clearSelection() {
    selectedCustomer.value = null
  }

  function reset() {
    customers.value = []
    selectedCustomer.value = null
    searchQuery.value = ''
    currentPage.value = 1
    lastPage.value = 1
    total.value = 0
    isOfflineMode.value = false
  }

  return {
    // State
    customers,
    selectedCustomer,
    isLoading,
    searchQuery,
    currentPage,
    lastPage,
    total,
    isOfflineMode,
    // Getters
    hasMore,
    // Actions
    fetchCustomers,
    searchCustomers,
    loadMore,
    selectCustomer,
    selectCustomerById,
    clearSelection,
    reset,
  }
})
