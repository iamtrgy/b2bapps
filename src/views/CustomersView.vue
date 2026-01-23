<template>
  <AppLayout>
    <div class="flex-1 p-4 lg:p-6 overflow-y-auto">
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-lg font-semibold">{{ UI_TEXT.title }}</h1>
          <Button
            variant="ghost"
            size="icon"
            :disabled="isLoading"
            :aria-label="UI_TEXT.refresh"
            @click="refresh"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
        </div>

        <!-- Search -->
        <div class="relative mb-4">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            type="text"
            :placeholder="UI_TEXT.searchPlaceholder"
            class="pl-9 h-9"
            :aria-label="UI_TEXT.searchPlaceholder"
            @input="handleSearch"
          />
          <Loader2
            v-if="isLoading && customers.length > 0"
            class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
          />
        </div>

        <!-- Error State -->
        <div
          v-if="error"
          class="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between"
        >
          <p class="text-sm text-destructive">{{ error }}</p>
          <Button variant="ghost" size="sm" @click="refresh">
            <RefreshCw class="h-4 w-4 mr-1" />
            {{ UI_TEXT.retry }}
          </Button>
        </div>

        <!-- Loading State -->
        <div
          v-if="isLoading && customers.length === 0"
          class="py-12 flex items-center justify-center"
          role="status"
          :aria-label="UI_TEXT.loading"
        >
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <!-- Empty State -->
        <div v-else-if="!error && customers.length === 0" class="py-12 text-center">
          <Users class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p class="text-sm text-muted-foreground">{{ UI_TEXT.noCustomers }}</p>
        </div>

        <!-- Customer List -->
        <div v-else>
          <div
            ref="scrollContainerRef"
            class="overflow-y-auto"
            :style="scrollContainerStyle"
            role="list"
            aria-label="Müşteri listesi"
          >
            <div :style="virtualContainerStyle">
              <CustomerListItem
                v-for="virtualRow in virtualItems"
                :key="customers[virtualRow.index].id"
                :customer="customers[virtualRow.index]"
                :virtual-start="virtualRow.start"
                @click="handleCustomerClick(customers[virtualRow.index])"
              />
            </div>
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="text-center py-4">
            <Button
              variant="outline"
              size="sm"
              :disabled="isLoading"
              @click="loadMore"
            >
              <Loader2 v-if="isLoading" class="h-3 w-3 mr-2 animate-spin" />
              {{ UI_TEXT.loadMore }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Detail Sheet -->
    <CustomerDetailSheet
      v-if="showDetail"
      :open="showDetail"
      :customer="customerDetail"
      :orders="customerOrders"
      :is-loading-orders="isLoadingOrders"
      :has-more-orders="hasMoreOrders"
      @update:open="showDetail = $event"
      @view-order="handleViewOrder"
      @load-more-orders="loadMoreOrders"
      @select-for-pos="selectForPOS"
    />

    <!-- Order Detail Sheet -->
    <OrderDetailSheet
      v-if="showOrderDetail"
      :open="showOrderDetail"
      :order="orderDetail"
      :is-loading="isLoadingOrderDetail"
      @update:open="showOrderDetail = $event"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { Users, Search, Loader2, RefreshCw } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomerListItem, CustomerDetailSheet, OrderDetailSheet } from '@/components/customers'
import { useCustomerCache } from '@/composables/useCustomerCache'
import { customerApi, orderApi } from '@/services/api'
import {
  UI_TEXT,
  ITEM_HEIGHT,
  VIRTUAL_OVERSCAN,
  SEARCH_DEBOUNCE_MS,
  SCROLL_CONTAINER_OFFSET,
} from '@/constants/customers'
import type { Customer, Order, CustomerRecentOrder } from '@/types'

const router = useRouter()
const { getCachedCustomer, setCachedCustomer } = useCustomerCache()

// Customer list state
const customers = ref<Customer[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const lastPage = ref(1)
const hasMore = ref(false)
const error = ref<string | null>(null)
const lastSearchTerm = ref<string | undefined>(undefined)

// Customer detail state
const showDetail = ref(false)
const customerDetail = ref<Customer | null>(null)
const customerOrders = ref<(Order | CustomerRecentOrder)[]>([])
const isLoadingOrders = ref(false)
const ordersPage = ref(1)
const ordersLastPage = ref(1)
const hasMoreOrders = ref(false)

// Order detail state
const showOrderDetail = ref(false)
const orderDetail = ref<Order | null>(null)
const isLoadingOrderDetail = ref(false)

// Search debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Virtual scrolling
const scrollContainerRef = ref<HTMLElement | null>(null)

const virtualizer = useVirtualizer({
  get count() { return customers.value.length },
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => ITEM_HEIGHT,
  overscan: VIRTUAL_OVERSCAN,
})

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalHeight = computed(() => virtualizer.value.getTotalSize())

// Computed styles
const scrollContainerStyle = computed(() => ({
  maxHeight: `calc(100vh - ${SCROLL_CONTAINER_OFFSET}px)`,
}))

const virtualContainerStyle = computed(() => ({
  height: `${totalHeight.value}px`,
  position: 'relative' as const,
}))

// API functions
async function fetchCustomers(page = 1, search?: string): Promise<void> {
  lastSearchTerm.value = search
  isLoading.value = true
  error.value = null

  try {
    const response = await customerApi.list(page, search)

    if (lastSearchTerm.value !== search) return

    if (page === 1) {
      customers.value = response.data
    } else {
      customers.value = [...customers.value, ...response.data]
    }

    currentPage.value = response.meta.current_page
    lastPage.value = response.meta.last_page
    hasMore.value = currentPage.value < lastPage.value
  } catch (err) {
    console.error('Failed to fetch customers:', err)
    if (lastSearchTerm.value === search) {
      error.value = UI_TEXT.errorLoading
    }
  } finally {
    if (lastSearchTerm.value === search) {
      isLoading.value = false
    }
  }
}

async function fetchCustomerOrders(customerId: number, page = 1): Promise<void> {
  isLoadingOrders.value = true

  try {
    const response = await orderApi.list(page, customerId)

    if (page === 1) {
      customerOrders.value = response.data
    } else {
      customerOrders.value = [...customerOrders.value, ...response.data]
    }

    ordersPage.value = response.meta.current_page
    ordersLastPage.value = response.meta.last_page
    hasMoreOrders.value = ordersPage.value < ordersLastPage.value
  } catch (err) {
    console.error('Failed to fetch customer orders:', err)
    // Fallback to recent_orders from customer data
    if (page === 1 && customerDetail.value?.recent_orders) {
      customerOrders.value = customerDetail.value.recent_orders
      hasMoreOrders.value = false
    }
  } finally {
    isLoadingOrders.value = false
  }
}

// Event handlers
function handleSearch(): void {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    fetchCustomers(1, searchQuery.value || undefined)
  }, SEARCH_DEBOUNCE_MS)
}

function loadMore(): void {
  if (hasMore.value && !isLoading.value) {
    fetchCustomers(currentPage.value + 1, searchQuery.value || undefined)
  }
}

function refresh(): void {
  fetchCustomers(1, searchQuery.value || undefined)
}

async function handleCustomerClick(customer: Customer): Promise<void> {
  customerDetail.value = customer
  showDetail.value = true

  // Reset orders state
  customerOrders.value = []
  ordersPage.value = 1
  hasMoreOrders.value = false

  // Check cache first
  const cachedCustomer = getCachedCustomer(customer.id)
  if (cachedCustomer) {
    customerDetail.value = cachedCustomer
    await fetchCustomerOrders(customer.id)
    return
  }

  // Fetch customer detail and orders in parallel
  try {
    const [fullData] = await Promise.all([
      customerApi.get(customer.id),
      fetchCustomerOrders(customer.id),
    ])
    customerDetail.value = fullData
    setCachedCustomer(customer.id, fullData)
  } catch (err) {
    console.error('Failed to fetch customer detail:', err)
  }
}

function loadMoreOrders(): void {
  if (hasMoreOrders.value && !isLoadingOrders.value && customerDetail.value) {
    fetchCustomerOrders(customerDetail.value.id, ordersPage.value + 1)
  }
}

async function handleViewOrder(orderId: number): Promise<void> {
  orderDetail.value = null
  isLoadingOrderDetail.value = true
  showOrderDetail.value = true

  try {
    orderDetail.value = await orderApi.get(orderId)
  } catch (err) {
    console.error('Failed to fetch order:', err)
  } finally {
    isLoadingOrderDetail.value = false
  }
}

function selectForPOS(): void {
  if (customerDetail.value) {
    localStorage.setItem('pos_selected_customer', JSON.stringify(customerDetail.value))
    router.push('/pos')
  }
}

// Cleanup state when detail sheet closes
watch(showDetail, (isOpen) => {
  if (!isOpen) {
    customerDetail.value = null
    customerOrders.value = []
    ordersPage.value = 1
    hasMoreOrders.value = false
  }
})

// Lifecycle
onMounted(() => {
  fetchCustomers()
})

onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
