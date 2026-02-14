import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, nextTick, type EffectScope } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useCheckout } from './useCheckout'
import { useCartStore } from '@/stores/cart'
import type { Customer, Product } from '@/types'

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ query: {} }),
}))

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockOrderCreate = vi.fn()
const mockOrderUpdate = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  orderApi: {
    create: (...args: unknown[]) => mockOrderCreate(...args),
    update: (...args: unknown[]) => mockOrderUpdate(...args),
  },
  authApi: {},
  customerApi: {},
  productApi: {},
  categoryApi: {},
  promotionApi: {},
}))

// Mock the offline store's saveOrderOffline since it uses IndexedDB
vi.mock('@/services/db', () => ({
  initDB: vi.fn(),
  savePendingOrder: vi.fn().mockResolvedValue(1),
  getPendingOrders: vi.fn().mockResolvedValue([]),
  getPendingOrderCount: vi.fn().mockResolvedValue(0),
  deletePendingOrder: vi.fn(),
  updatePendingOrder: vi.fn(),
  isCacheStale: vi.fn().mockReturnValue(false),
  clearAllCache: vi.fn(),
  deleteDatabase: vi.fn(),
  cacheProducts: vi.fn(),
  getCachedProducts: vi.fn().mockResolvedValue([]),
  getProductCountByIndex: vi.fn().mockResolvedValue(0),
  cacheCustomers: vi.fn(),
  getCachedCustomers: vi.fn().mockResolvedValue([]),
  getCustomerCount: vi.fn().mockResolvedValue(0),
  cacheCategories: vi.fn(),
  getCachedCategories: vi.fn().mockResolvedValue([]),
}))

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1, name: 'Test Product', sku: 'TP-001', barcode: null, barcode_box: null,
    image_url: null, base_price: 10, price_list_price: 10, price_list_discount: 0,
    price_list_discount_percent: 0, promotion_discount: 0, promotion_discount_percent: 0,
    customer_price: 10, total_discount: 0, total_discount_percent: 0, pricing_source: 'base',
    promotion_id: null, promotion_name: null, promotion_type: null, promotion_value: null,
    pieces_per_box: 12, piece_price: 10, box_price: 120, allow_broken_case: true,
    broken_case_discount: 0, broken_case_piece_price: 10,
    vat_rate: { id: 1, rate: 18 }, stock_quantity: 100,
    availability_status: 'in_stock', can_purchase: true, boxes_per_case: 1,
    moq_quantity: 1, moq_unit: 'piece', ...overrides,
  }
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1, company_name: 'Test Co', contact_name: 'John',
    contact_email: 'j@test.com', contact_phone: '555', customer_tier: 'gold',
    ...overrides,
  }
}

describe('useCheckout', () => {
  let scope: EffectScope
  let checkout: ReturnType<typeof useCheckout>
  let cartStore: ReturnType<typeof useCartStore>
  const selectedCustomer = ref<Customer | null>(makeCustomer())
  const showMobileCart = ref(false)
  const showErrorToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    selectedCustomer.value = makeCustomer()
    setActivePinia(createPinia())
    cartStore = useCartStore()
    scope = effectScope()
    checkout = scope.run(() => useCheckout({ selectedCustomer, showMobileCart, showErrorToast }))!
  })

  afterEach(() => {
    scope.stop()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(checkout.isSubmitting.value).toBe(false)
      expect(checkout.showOrderSuccess.value).toBe(false)
      expect(checkout.showCheckoutConfirm.value).toBe(false)
      expect(checkout.showClearCartConfirm.value).toBe(false)
      expect(checkout.savedOffline.value).toBe(false)
      expect(checkout.orderJustUpdated.value).toBe(false)
      expect(checkout.orderJustReturned.value).toBe(false)
      expect(checkout.lastOrderNumber.value).toBe('')
    })
  })

  describe('computed', () => {
    it('canCheckout is false when cart is empty', async () => {
      await nextTick()
      expect(checkout.canCheckout.value).toBe(false)
    })

    it('canCheckout is true when customer selected and cart has items', async () => {
      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      await nextTick()
      expect(checkout.canCheckout.value).toBe(true)
    })

    it('canCheckout is false when no customer', async () => {
      selectedCustomer.value = null
      cartStore.addItem(makeProduct(), 1, 'box')
      await nextTick()
      expect(checkout.canCheckout.value).toBe(false)
    })

    it('isEditMode reflects cart store', async () => {
      expect(checkout.isEditMode.value).toBe(false)
      cartStore.editingOrderId = 123
      await nextTick()
      expect(checkout.isEditMode.value).toBe(true)
    })
  })

  describe('confirmCheckout', () => {
    it('closes confirm dialog and triggers checkout', async () => {
      mockOrderCreate.mockResolvedValue({
        success: true, order_id: 1, order_number: 'ORD-001', message: 'OK',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      checkout.showCheckoutConfirm.value = true

      await checkout.confirmCheckout()

      expect(checkout.showCheckoutConfirm.value).toBe(false)
    })
  })

  describe('handleCheckout - online new order', () => {
    it('creates order and shows success', async () => {
      mockOrderCreate.mockResolvedValue({
        success: true, order_id: 42, order_number: 'ORD-042', message: 'Created',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')

      await checkout.confirmCheckout()

      expect(mockOrderCreate).toHaveBeenCalled()
      expect(checkout.showOrderSuccess.value).toBe(true)
      expect(checkout.lastOrderNumber.value).toBe('ORD-042')
      expect(cartStore.items).toHaveLength(0)
    })

    it('shows error toast on API failure response', async () => {
      mockOrderCreate.mockResolvedValue({
        success: false, order_id: 0, order_number: '', message: 'Stok yetersiz',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')

      await checkout.confirmCheckout()

      expect(showErrorToast).toHaveBeenCalledWith('Stok yetersiz', 5000)
      expect(checkout.showOrderSuccess.value).toBe(false)
    })
  })

  describe('handleCheckout - edit mode', () => {
    it('updates existing order', async () => {
      mockOrderUpdate.mockResolvedValue({
        success: true, order_id: 100, order_number: 'ORD-100', message: 'Updated',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      cartStore.editingOrderId = 100

      await checkout.confirmCheckout()

      expect(mockOrderUpdate).toHaveBeenCalledWith(100, expect.any(Object))
      expect(checkout.orderJustUpdated.value).toBe(true)
      expect(checkout.showOrderSuccess.value).toBe(true)
      expect(mockReplace).toHaveBeenCalledWith('/pos')
    })
  })

  describe('confirmClearCart', () => {
    it('clears cart and closes dialog', () => {
      cartStore.addItem(makeProduct(), 1, 'box')
      checkout.showClearCartConfirm.value = true

      checkout.confirmClearCart()

      expect(cartStore.items).toHaveLength(0)
      expect(checkout.showClearCartConfirm.value).toBe(false)
    })
  })

  describe('cancelEditMode', () => {
    it('clears cart and navigates to /pos', () => {
      cartStore.addItem(makeProduct(), 1, 'box')
      cartStore.editingOrderId = 100

      checkout.cancelEditMode()

      expect(cartStore.items).toHaveLength(0)
      expect(cartStore.editingOrderId).toBeNull()
      expect(mockReplace).toHaveBeenCalledWith('/pos')
    })
  })

  describe('showMobileCheckoutConfirm', () => {
    it('closes mobile cart and opens checkout confirm', () => {
      showMobileCart.value = true
      checkout.showMobileCheckoutConfirm()

      expect(showMobileCart.value).toBe(false)
      expect(checkout.showCheckoutConfirm.value).toBe(true)
    })
  })

  describe('handleOrderSuccessClose', () => {
    it('resets all success state', () => {
      checkout.showOrderSuccess.value = true
      checkout.lastOrderNumber.value = 'ORD-001'
      checkout.orderJustUpdated.value = true
      checkout.orderJustReturned.value = true

      checkout.handleOrderSuccessClose()

      expect(checkout.showOrderSuccess.value).toBe(false)
      expect(checkout.lastOrderNumber.value).toBe('')
      expect(checkout.orderJustUpdated.value).toBe(false)
      expect(checkout.orderJustReturned.value).toBe(false)
    })
  })

  describe('viewOrder', () => {
    it('navigates to order detail and closes success dialog', () => {
      checkout.lastOrderId.value = 42
      checkout.showOrderSuccess.value = true

      checkout.viewOrder()

      expect(mockPush).toHaveBeenCalledWith('/orders/42')
      expect(checkout.showOrderSuccess.value).toBe(false)
    })

    it('does not navigate when no lastOrderId', () => {
      checkout.lastOrderId.value = null
      checkout.viewOrder()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('handleCheckout - return mode', () => {
    it('creates return order and shows success', async () => {
      mockOrderCreate.mockResolvedValue({
        success: true, order_id: 55, order_number: 'RET-055', message: 'OK',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      cartStore.returnMode = true

      await checkout.handleCheckout()

      expect(mockOrderCreate).toHaveBeenCalled()
      expect(checkout.orderJustReturned.value).toBe(true)
      expect(checkout.showOrderSuccess.value).toBe(true)
      expect(checkout.lastOrderNumber.value).toBe('RET-055')
    })

    it('shows error toast on return mode failure', async () => {
      mockOrderCreate.mockResolvedValue({
        success: false, order_id: 0, order_number: '', message: 'İade oluşturulamadı',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      cartStore.returnMode = true

      await checkout.handleCheckout()

      expect(showErrorToast).toHaveBeenCalledWith('İade oluşturulamadı', 5000)
      expect(checkout.showOrderSuccess.value).toBe(false)
    })
  })

  describe('handleCheckout - edit mode error', () => {
    it('shows error toast on update failure response', async () => {
      mockOrderUpdate.mockResolvedValue({
        success: false, order_id: 0, order_number: '', message: 'Sipariş güncellenemedi',
      })

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      cartStore.editingOrderId = 100

      await checkout.handleCheckout()

      expect(showErrorToast).toHaveBeenCalledWith('Sipariş güncellenemedi', 5000)
      expect(checkout.showOrderSuccess.value).toBe(false)
    })

    it('shows error toast on update API exception', async () => {
      mockOrderUpdate.mockRejectedValue(new Error('Network'))

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')
      cartStore.editingOrderId = 100

      await checkout.handleCheckout()

      expect(showErrorToast).toHaveBeenCalled()
    })
  })

  describe('handleCheckout - offline', () => {
    it('saves order offline when not connected', async () => {
      const { useOfflineStore } = await import('@/stores/offline')
      const offlineStore = useOfflineStore()
      offlineStore.$patch({ isOnline: false })
      vi.spyOn(offlineStore, 'saveOrderOffline').mockResolvedValue(99)

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')

      await checkout.handleCheckout()

      expect(offlineStore.saveOrderOffline).toHaveBeenCalled()
      expect(checkout.savedOffline.value).toBe(true)
      expect(checkout.lastOrderNumber.value).toBe('OFFLINE-99')
      expect(checkout.showOrderSuccess.value).toBe(true)
    })

    it('falls back to offline when online create fails', async () => {
      mockOrderCreate.mockRejectedValue(new Error('Server error'))

      const { useOfflineStore } = await import('@/stores/offline')
      const offlineStore = useOfflineStore()
      offlineStore.$patch({ isOnline: true })
      vi.spyOn(offlineStore, 'saveOrderOffline').mockResolvedValue(77)

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')

      await checkout.handleCheckout()

      expect(offlineStore.saveOrderOffline).toHaveBeenCalled()
      expect(checkout.savedOffline.value).toBe(true)
      expect(checkout.lastOrderNumber.value).toBe('OFFLINE-77')
    })

    it('shows error when both online and offline fail', async () => {
      mockOrderCreate.mockRejectedValue(new Error('Server error'))

      const { useOfflineStore } = await import('@/stores/offline')
      const offlineStore = useOfflineStore()
      offlineStore.$patch({ isOnline: true })
      vi.spyOn(offlineStore, 'saveOrderOffline').mockRejectedValue(new Error('DB error'))

      cartStore.setCustomer(makeCustomer())
      cartStore.addItem(makeProduct(), 1, 'box')

      await checkout.handleCheckout()

      expect(showErrorToast).toHaveBeenCalledWith('Sipariş kaydedilemedi. Lütfen tekrar deneyin.', 5000)
    })
  })

  describe('handleCheckout - guards', () => {
    it('does nothing when canCheckout is false', async () => {
      // No customer, no cart items
      selectedCustomer.value = null

      await checkout.handleCheckout()

      expect(mockOrderCreate).not.toHaveBeenCalled()
      expect(checkout.isSubmitting.value).toBe(false)
    })
  })
})
