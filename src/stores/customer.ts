import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { customerApi } from '@/services/api'
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

  // Getters
  const hasMore = computed(() => currentPage.value < lastPage.value)

  // Actions
  async function fetchCustomers(page = 1, search?: string) {
    isLoading.value = true
    try {
      const response = await customerApi.list(page, search)

      if (page === 1) {
        customers.value = response.data
      } else {
        customers.value = [...customers.value, ...response.data]
      }

      currentPage.value = response.meta.current_page
      lastPage.value = response.meta.last_page
      total.value = response.meta.total
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      throw error
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
