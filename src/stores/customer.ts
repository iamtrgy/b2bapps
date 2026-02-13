import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { customerApi } from '@/services/api'
import { useOfflineStore } from '@/stores/offline'
import type { Customer } from '@/types'

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

  // Actions
  async function fetchCustomers(page = 1, search?: string) {
    isLoading.value = true
    const offlineStore = useOfflineStore()

    try {
      if (offlineStore.isOnline) {
        // Online: fetch from API
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

        // Cache customers for offline use
        if (page === 1 && !search) {
          offlineStore.cacheCustomerList(response.data)
        }
      } else {
        // Offline: use cached customers
        const cachedCustomers = await offlineStore.getOfflineCustomers()

        if (search) {
          const searchLower = search.toLowerCase()
          customers.value = cachedCustomers.filter(c =>
            c.company_name.toLowerCase().includes(searchLower) ||
            c.contact_name?.toLowerCase().includes(searchLower) ||
            c.contact_email?.toLowerCase().includes(searchLower) ||
            c.afas_debtor_id?.toLowerCase().includes(searchLower)
          ) as unknown as Customer[]
        } else {
          customers.value = cachedCustomers as unknown as Customer[]
        }

        currentPage.value = 1
        lastPage.value = 1
        total.value = customers.value.length
        isOfflineMode.value = true
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      // Try offline mode on error
      try {
        const cachedCustomers = await offlineStore.getOfflineCustomers()
        if (search) {
          const searchLower = search.toLowerCase()
          customers.value = cachedCustomers.filter(c =>
            c.company_name.toLowerCase().includes(searchLower) ||
            c.contact_name?.toLowerCase().includes(searchLower) ||
            c.contact_email?.toLowerCase().includes(searchLower) ||
            c.afas_debtor_id?.toLowerCase().includes(searchLower)
          ) as unknown as Customer[]
        } else {
          customers.value = cachedCustomers as unknown as Customer[]
        }
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
        console.error('Failed to fetch customer:', error)
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
