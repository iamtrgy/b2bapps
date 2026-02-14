import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, type EffectScope, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useReturnMode } from './useReturnMode'
import { useCartStore } from '@/stores/cart'
import type { Customer, ReturnableOrder } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

const mockGetReturnableOrders = vi.fn()

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  customerApi: {
    getReturnableOrders: (...args: unknown[]) => mockGetReturnableOrders(...args),
  },
  authApi: {},
  orderApi: {},
  productApi: {},
  categoryApi: {},
  promotionApi: {},
}))

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1, company_name: 'Test Co', contact_name: 'John',
    contact_email: 'j@test.com', contact_phone: '555', customer_tier: 'gold',
    ...overrides,
  }
}

function makeReturnableOrder(overrides: Partial<ReturnableOrder> = {}): ReturnableOrder {
  return {
    id: 200,
    order_number: 'ORD-200',
    created_at: '2025-01-01',
    total_amount: 500,
    status: 'delivered',
    already_returned: false,
    items: [{
      product_id: 5, product_name: 'Widget', product_sku: 'W-005',
      image_url: null, quantity_ordered: 10, quantity_returnable: 7,
      unit_price: 50, original_price: 55, unit_type: 'box', vat_rate: 18,
    }],
    ...overrides,
  }
}

describe('useReturnMode', () => {
  let scope: EffectScope
  let returnMode: ReturnType<typeof useReturnMode>
  let cartStore: ReturnType<typeof useCartStore>
  const selectedCustomer = ref<Customer | null>(makeCustomer())

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    cartStore = useCartStore()
    scope = effectScope()
    returnMode = scope.run(() => useReturnMode(selectedCustomer))!
  })

  afterEach(() => {
    scope.stop()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(returnMode.showReturnableOrders.value).toBe(false)
      expect(returnMode.returnableOrders.value).toEqual([])
      expect(returnMode.isLoadingReturnableOrders.value).toBe(false)
      expect(returnMode.isReturnMode.value).toBe(false)
    })
  })

  describe('isReturnMode', () => {
    it('reflects cart store returnMode', async () => {
      cartStore.enterReturnMode()
      await nextTick()
      expect(returnMode.isReturnMode.value).toBe(true)
    })
  })

  describe('handleReturnToggle', () => {
    it('fetches returnable orders for selected customer', async () => {
      const orders = [makeReturnableOrder()]
      mockGetReturnableOrders.mockResolvedValue({ success: true, data: orders })

      await returnMode.handleReturnToggle()

      expect(mockGetReturnableOrders).toHaveBeenCalledWith(1)
      expect(returnMode.showReturnableOrders.value).toBe(true)
      expect(returnMode.returnableOrders.value).toEqual(orders)
      expect(returnMode.isLoadingReturnableOrders.value).toBe(false)
    })

    it('does nothing when no customer selected', async () => {
      selectedCustomer.value = null
      await returnMode.handleReturnToggle()
      expect(mockGetReturnableOrders).not.toHaveBeenCalled()
    })

    it('handles API error gracefully', async () => {
      mockGetReturnableOrders.mockRejectedValue(new Error('Network error'))

      await returnMode.handleReturnToggle()

      expect(returnMode.isLoadingReturnableOrders.value).toBe(false)
      expect(returnMode.returnableOrders.value).toEqual([])
    })

    it('logs error when fetchReturnableOrders API fails', async () => {
      selectedCustomer.value = makeCustomer()
      const apiError = new Error('Server crash')
      mockGetReturnableOrders.mockRejectedValue(apiError)

      await returnMode.handleReturnToggle()

      expect(mockLoggerError).toHaveBeenCalledWith('Failed to fetch returnable orders:', apiError)
      expect(returnMode.isLoadingReturnableOrders.value).toBe(false)
      expect(returnMode.returnableOrders.value).toEqual([])
    })
  })

  describe('selectReturnableOrder', () => {
    it('enters return mode and loads items', () => {
      const order = makeReturnableOrder()
      returnMode.showReturnableOrders.value = true

      returnMode.selectReturnableOrder(order)

      expect(cartStore.returnMode).toBe(true)
      expect(cartStore.returnReferenceOrderId).toBe(200)
      expect(returnMode.showReturnableOrders.value).toBe(false)
      // Cart items loaded from order
      expect(cartStore.items).toHaveLength(1)
      expect(cartStore.items[0].product_id).toBe(5)
      expect(cartStore.items[0].quantity).toBe(7)
    })
  })

  describe('skipReturnableOrderSelection', () => {
    it('enters return mode without loading items', () => {
      returnMode.showReturnableOrders.value = true

      returnMode.skipReturnableOrderSelection()

      expect(cartStore.returnMode).toBe(true)
      expect(returnMode.showReturnableOrders.value).toBe(false)
      expect(cartStore.items).toHaveLength(0)
    })
  })

  describe('exitReturnMode', () => {
    it('exits return mode via cart store', () => {
      cartStore.enterReturnMode()
      returnMode.exitReturnMode()

      expect(cartStore.returnMode).toBe(false)
      expect(cartStore.returnReferenceOrderId).toBeNull()
    })
  })
})
