import { ref, computed, onUnmounted, type Ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useProductStore } from '@/stores/products'
import { productApi } from '@/services/api'
import type { Customer, Product } from '@/types'
import { logger } from '@/utils/logger'
import { getErrorMessage, isCanceledError } from '@/utils/error'

export function useCartOperations(selectedCustomer: Ref<Customer | null>) {
  const cartStore = useCartStore()
  const productStore = useProductStore()

  // Toast state
  const showMobileCart = ref(false)
  const showAddedToast = ref(false)
  const showUndoToast = ref(false)
  const showLowStockWarning = ref(false)
  const lowStockMessage = ref('')

  let addedToastTimeout: ReturnType<typeof setTimeout> | null = null
  let undoToastTimeout: ReturnType<typeof setTimeout> | null = null
  let lowStockTimeout: ReturnType<typeof setTimeout> | null = null
  let historyAbortController: AbortController | null = null

  // Out of stock modal
  const showOutOfStockModal = ref(false)
  const outOfStockProduct = ref<Product | null>(null)
  const isUpdatingAvailability = ref(false)

  // Product detail modal
  const showProductDetail = ref(false)
  const productDetail = ref<Product | null>(null)
  const productDetailHistory = ref<Array<{
    order_number: string
    status: string
    date: string
    date_iso: string
    quantity: number
    unit_type: 'box' | 'piece'
    unit_price: number
    unit_price_formatted: string
    per_piece_price: number
    per_piece_price_formatted: string
    line_total: number
    line_total_formatted: string
  }>>([])
  const isLoadingProductHistory = ref(false)

  // Stock warnings
  const stockWarnings = computed(() => {
    const warnings: { productId: number; name: string; stock: number }[] = []
    for (const item of cartStore.items) {
      const stock = item.stock_quantity ?? 0
      if (stock > 0) {
        const piecesPerBox = item.pieces_per_box || 1
        const totalPieces = item.unit_type === 'box' ? item.quantity * piecesPerBox : item.quantity
        if (totalPieces > stock) {
          warnings.push({ productId: item.product_id, name: item.name, stock })
        }
      }
    }
    return warnings
  })

  const stockWarningMap = computed(() => {
    const map = new Map<number, string>()
    stockWarnings.value.forEach(w => map.set(w.productId, 'Mevcut stoku aşıyor'))
    return map
  })

  function getStockWarning(productId: number): string | undefined {
    return stockWarningMap.value.get(productId)
  }

  function showErrorToast(message: string, duration = 3000) {
    lowStockMessage.value = message
    showLowStockWarning.value = true
    if (lowStockTimeout) clearTimeout(lowStockTimeout)
    lowStockTimeout = setTimeout(() => {
      showLowStockWarning.value = false
    }, duration)
  }

  function handleAddToCart(product: Product) {
    if (!product.can_purchase) {
      outOfStockProduct.value = product
      showOutOfStockModal.value = true
      return
    }
    addProductToCart(product)
  }

  function addProductToCart(product: Product) {
    const piecesPerBox = product.pieces_per_box || 1
    const unitType = piecesPerBox > 1 ? 'box' : 'piece'
    const quantity = product.moq_quantity || 1

    const existingItem = cartStore.items.find(
      item => item.product_id === product.id
    )

    const currentQty = existingItem ? existingItem.quantity : 0
    const existingUnitType = existingItem ? existingItem.unit_type : unitType
    const existingPiecesPerBox = existingItem?.pieces_per_box || piecesPerBox
    const currentPieces = existingUnitType === 'box' ? currentQty * existingPiecesPerBox : currentQty
    const addingPieces = unitType === 'box' ? quantity * piecesPerBox : quantity
    const totalPieces = currentPieces + addingPieces

    cartStore.addItem(product, quantity, unitType)

    if (product.stock_quantity > 0 && totalPieces > product.stock_quantity) {
      showErrorToast(`${product.name}: Sadece mevcut: ${product.stock_quantity}`)
    }

    // Show success toast
    showAddedToast.value = true
    if (addedToastTimeout) clearTimeout(addedToastTimeout)
    addedToastTimeout = setTimeout(() => {
      showAddedToast.value = false
    }, 2000)
  }

  async function handleSetAvailability(type: 'backorder' | 'preorder') {
    if (!outOfStockProduct.value) return

    isUpdatingAvailability.value = true

    try {
      const result = await productApi.updateAvailability(outOfStockProduct.value.id, type)
      logger.info('Availability update result:', result)

      if (result.success) {
        const updatedProduct: Product = {
          ...outOfStockProduct.value,
          ...(result.product || {}),
          can_purchase: result.product?.can_purchase ?? true,
          allow_backorder: result.product?.allow_backorder ?? (type === 'backorder'),
          is_preorder: result.product?.is_preorder ?? (type === 'preorder'),
          availability_status: result.product?.availability_status ?? type,
        }

        productStore.updateProduct(updatedProduct)
        showOutOfStockModal.value = false
        addProductToCart(updatedProduct)
      } else {
        logger.error('API returned success: false', result)
        showErrorToast(result.message || 'Güncelleme başarısız oldu')
      }
    } catch (error: unknown) {
      logger.error('Failed to update availability:', error)
      showErrorToast(getErrorMessage(error, 'Bir hata oluştu'))
    } finally {
      isUpdatingAvailability.value = false
    }
  }

  async function openProductDetail(product: Product) {
    productDetail.value = product
    showProductDetail.value = true

    if (selectedCustomer.value) {
      // Cancel any in-flight purchase history request
      if (historyAbortController) historyAbortController.abort()
      historyAbortController = new AbortController()
      const signal = historyAbortController.signal

      isLoadingProductHistory.value = true
      productDetailHistory.value = []
      try {
        const response = await productApi.getPurchaseHistory(selectedCustomer.value.id, product.id, signal)
        productDetailHistory.value = response.history || []
      } catch (error) {
        if (isCanceledError(error) || signal.aborted) return
        logger.error('Failed to fetch purchase history:', error)
      } finally {
        if (!signal.aborted) isLoadingProductHistory.value = false
      }
    }
  }

  function addProductFromDetail() {
    if (productDetail.value) {
      handleAddToCart(productDetail.value)
      showProductDetail.value = false
    }
  }

  function handleRemoveItem(index: number) {
    cartStore.removeItem(index)

    showUndoToast.value = true
    if (undoToastTimeout) clearTimeout(undoToastTimeout)
    undoToastTimeout = setTimeout(() => {
      showUndoToast.value = false
      cartStore.clearLastRemoved()
    }, 5000)
  }

  function handleUpdateQuantity(index: number, newQty: number, customPrice?: number, boxPrice?: number, piecePrice?: number) {
    cartStore.updateQuantity(index, newQty, { custom: customPrice, box: boxPrice, piece: piecePrice })
  }

  function handleUndoRemove() {
    cartStore.undoRemove()
    showUndoToast.value = false
    if (undoToastTimeout) clearTimeout(undoToastTimeout)
  }

  onUnmounted(() => {
    if (addedToastTimeout) clearTimeout(addedToastTimeout)
    if (undoToastTimeout) clearTimeout(undoToastTimeout)
    if (lowStockTimeout) clearTimeout(lowStockTimeout)
    if (historyAbortController) historyAbortController.abort()
  })

  return {
    // Toast state
    showMobileCart,
    showAddedToast,
    showUndoToast,
    showLowStockWarning,
    lowStockMessage,
    // Out of stock
    showOutOfStockModal,
    outOfStockProduct,
    isUpdatingAvailability,
    // Product detail
    showProductDetail,
    productDetail,
    productDetailHistory,
    isLoadingProductHistory,
    // Stock warnings
    stockWarnings,
    getStockWarning,
    // Functions
    showErrorToast,
    handleAddToCart,
    addProductToCart,
    handleRemoveItem,
    handleUpdateQuantity,
    handleUndoRemove,
    handleSetAvailability,
    openProductDetail,
    addProductFromDetail,
  }
}
