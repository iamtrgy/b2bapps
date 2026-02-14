import { ref, computed, type Ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { customerApi } from '@/services/api'
import type { Customer, ReturnableOrder } from '@/types'
import { logger } from '@/utils/logger'

export function useReturnMode(selectedCustomer: Ref<Customer | null>) {
  const cartStore = useCartStore()

  const showReturnableOrders = ref(false)
  const returnableOrders = ref<ReturnableOrder[]>([])
  const isLoadingReturnableOrders = ref(false)

  const isReturnMode = computed(() => cartStore.returnMode)

  async function handleReturnToggle() {
    if (!selectedCustomer.value) return

    isLoadingReturnableOrders.value = true
    showReturnableOrders.value = true
    returnableOrders.value = []

    try {
      const response = await customerApi.getReturnableOrders(selectedCustomer.value.id)
      logger.info('Returnable orders API response:', JSON.stringify(response, null, 2))
      returnableOrders.value = response.data || []
    } catch (error) {
      logger.error('Failed to fetch returnable orders:', error)
    } finally {
      isLoadingReturnableOrders.value = false
    }
  }

  function selectReturnableOrder(order: ReturnableOrder) {
    cartStore.enterReturnMode()
    cartStore.loadReturnItems(order)
    showReturnableOrders.value = false
  }

  function skipReturnableOrderSelection() {
    cartStore.enterReturnMode()
    showReturnableOrders.value = false
  }

  function exitReturnMode() {
    cartStore.exitReturnMode()
  }

  return {
    showReturnableOrders,
    returnableOrders,
    isLoadingReturnableOrders,
    isReturnMode,
    handleReturnToggle,
    selectReturnableOrder,
    skipReturnableOrderSelection,
    exitReturnMode,
  }
}
