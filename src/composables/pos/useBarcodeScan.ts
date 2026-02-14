import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { useProductStore } from '@/stores/products'
import { useCartStore } from '@/stores/cart'
import type { Customer } from '@/types'
import { logger } from '@/utils/logger'

interface BarcodeScanOptions {
  selectedCustomer: Ref<Customer | null>
  showErrorToast: (message: string) => void
}

export function useBarcodeScan({ selectedCustomer, showErrorToast }: BarcodeScanOptions) {
  const productStore = useProductStore()
  const cartStore = useCartStore()
  const showScanner = ref(false)

  let barcodeBuffer = ''
  let barcodeTimeout: ReturnType<typeof setTimeout> | null = null
  const BARCODE_TIMEOUT = 100

  async function handleBarcodeScan(barcode: string) {
    if (!selectedCustomer.value) return

    showScanner.value = false
    const result = await productStore.findByBarcode(barcode, selectedCustomer.value.id)

    if (result.success && result.product) {
      const product = result.product
      const unitType = result.scanned_unit || product.moq_unit || 'box'
      const quantity = product.moq_quantity || 1
      cartStore.addItem(product, quantity, unitType)
    } else {
      logger.error('Product not found for barcode:', barcode)
      showErrorToast('Ürün bulunamadı')
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    if (barcodeTimeout) {
      clearTimeout(barcodeTimeout)
    }

    if (event.key === 'Enter' && barcodeBuffer.length >= 4) {
      const barcode = barcodeBuffer
      barcodeBuffer = ''
      handleBarcodeScan(barcode)
      return
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      barcodeBuffer += event.key

      barcodeTimeout = setTimeout(() => {
        barcodeBuffer = ''
      }, BARCODE_TIMEOUT)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    if (barcodeTimeout) clearTimeout(barcodeTimeout)
  })

  return {
    showScanner,
    handleBarcodeScan,
  }
}
