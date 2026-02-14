import { ref, computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useOfflineStore } from '@/stores/offline'
import { orderApi } from '@/services/api'
import type { Customer } from '@/types'
import { logger } from '@/utils/logger'
import { getErrorMessage } from '@/utils/error'

interface CheckoutOptions {
  selectedCustomer: Ref<Customer | null>
  showMobileCart: Ref<boolean>
  showErrorToast: (message: string, duration?: number) => void
}

export function useCheckout({ selectedCustomer, showMobileCart, showErrorToast }: CheckoutOptions) {
  const router = useRouter()
  const cartStore = useCartStore()
  const offlineStore = useOfflineStore()

  const isSubmitting = ref(false)
  const showOrderSuccess = ref(false)
  const lastOrderId = ref<number | null>(null)
  const lastOrderNumber = ref('')
  const showCheckoutConfirm = ref(false)
  const showClearCartConfirm = ref(false)
  const savedOffline = ref(false)
  const orderJustUpdated = ref(false)
  const orderJustReturned = ref(false)

  const isEditMode = computed(() => !!cartStore.editingOrderId)

  const canCheckout = computed(() => {
    return !!selectedCustomer.value && !cartStore.isEmpty
  })

  async function handleCheckout() {
    if (!canCheckout.value || !selectedCustomer.value) return

    isSubmitting.value = true
    savedOffline.value = false
    orderJustUpdated.value = false
    orderJustReturned.value = false

    // Helper to save order offline (sale or return)
    const saveOffline = async () => {
      const localId = await offlineStore.saveOrderOffline({
        customerId: selectedCustomer.value!.id,
        customerName: selectedCustomer.value!.company_name,
        orderType: cartStore.returnMode ? 'return' : 'sale',
        returnReferenceOrderId: cartStore.returnMode ? cartStore.returnReferenceOrderId : null,
        items: cartStore.items.map(item => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          base_price: item.base_price,
          unit_type: item.unit_type,
          pieces_per_box: item.pieces_per_box,
          vat_rate: item.vat_rate,
        })),
        subtotal: cartStore.subtotal,
        vatTotal: cartStore.vatTotal,
        total: cartStore.total,
        notes: cartStore.notes,
      })

      lastOrderId.value = null
      lastOrderNumber.value = `OFFLINE-${localId}`
      savedOffline.value = true
      showOrderSuccess.value = true
      if (cartStore.returnMode) {
        orderJustReturned.value = true
        cartStore.exitReturnMode()
      } else {
        cartStore.clear()
      }
    }

    try {
      if (isEditMode.value) {
        // Edit mode — online only (can't edit offline)
        const payload = cartStore.getOrderPayload()
        const result = await orderApi.update(cartStore.editingOrderId!, payload)

        if (result.success) {
          lastOrderId.value = result.order_id
          lastOrderNumber.value = result.order_number
          orderJustUpdated.value = true
          cartStore.clear()
          cartStore.clearEditMode()
          router.replace('/pos')
          showOrderSuccess.value = true
        } else {
          showErrorToast(result.message || 'Sipariş güncellenemedi', 5000)
        }
      } else if (offlineStore.isOnline) {
        // Online — create sale or return via API
        const payload = cartStore.getOrderPayload()
        const result = await orderApi.create(payload)

        if (result.success) {
          lastOrderId.value = result.order_id
          lastOrderNumber.value = result.order_number
          if (cartStore.returnMode) {
            orderJustReturned.value = true
            cartStore.exitReturnMode()
          } else {
            cartStore.clear()
          }
          showOrderSuccess.value = true
        } else {
          const msg = cartStore.returnMode ? 'İade oluşturulamadı' : 'Sipariş oluşturulamadı'
          showErrorToast(result.message || msg, 5000)
        }
      } else {
        // Offline — save locally (both sales and returns)
        await saveOffline()
      }
    } catch (error: unknown) {
      logger.error('Failed to create order:', error)

      if (isEditMode.value) {
        const msg = getErrorMessage(error, 'Sipariş güncellenirken bir hata oluştu')
        showErrorToast(msg, 5000)
      }

      // If online request fails, try saving offline (for new orders and returns)
      if (!isEditMode.value && selectedCustomer.value) {
        try {
          await saveOffline()
        } catch (offlineError) {
          logger.error('Failed to save order offline:', offlineError)
          showErrorToast('Sipariş kaydedilemedi. Lütfen tekrar deneyin.', 5000)
        }
      }
    } finally {
      isSubmitting.value = false
    }
  }

  function showMobileCheckoutConfirm() {
    showMobileCart.value = false
    showCheckoutConfirm.value = true
  }

  async function confirmCheckout() {
    showCheckoutConfirm.value = false
    await handleCheckout()
  }

  function confirmClearCart() {
    cartStore.clear()
    showClearCartConfirm.value = false
  }

  function cancelEditMode() {
    cartStore.clear()
    cartStore.clearEditMode()
    router.replace('/pos')
  }

  function handleOrderSuccessClose() {
    showOrderSuccess.value = false
    lastOrderId.value = null
    lastOrderNumber.value = ''
    orderJustUpdated.value = false
    orderJustReturned.value = false
  }

  function viewOrder() {
    if (lastOrderId.value) {
      router.push(`/orders/${lastOrderId.value}`)
    }
    handleOrderSuccessClose()
  }

  return {
    isSubmitting,
    showOrderSuccess,
    lastOrderId,
    lastOrderNumber,
    showCheckoutConfirm,
    showClearCartConfirm,
    savedOffline,
    orderJustUpdated,
    orderJustReturned,
    isEditMode,
    canCheckout,
    handleCheckout,
    confirmCheckout,
    showMobileCheckoutConfirm,
    confirmClearCart,
    cancelEditMode,
    handleOrderSuccessClose,
    viewOrder,
  }
}
