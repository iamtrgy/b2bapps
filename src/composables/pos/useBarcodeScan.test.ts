import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, defineComponent, h, type EffectScope } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useBarcodeScan } from './useBarcodeScan'
import { useCartStore } from '@/stores/cart'
import { useProductStore } from '@/stores/products'
import type { Customer, Product } from '@/types'

vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  productApi: {
    getAll: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    getBestSellers: vi.fn().mockResolvedValue({ products: [] }),
    getFavorites: vi.fn().mockResolvedValue({ products: [] }),
    getDiscounted: vi.fn().mockResolvedValue({ products: [] }),
    getByCategory: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    search: vi.fn().mockResolvedValue({ products: [] }),
    findByBarcode: vi.fn(),
    updateAvailability: vi.fn(),
    getPurchaseHistory: vi.fn(),
  },
  authApi: {},
  customerApi: {},
  orderApi: {},
  categoryApi: {},
  promotionApi: {},
}))

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
    id: 1, name: 'Test Product', sku: 'TP-001', barcode: '1234567890', barcode_box: null,
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

describe('useBarcodeScan', () => {
  let scope: EffectScope
  let scan: ReturnType<typeof useBarcodeScan>
  let cartStore: ReturnType<typeof useCartStore>
  let productStore: ReturnType<typeof useProductStore>
  let spyFindByBarcode: ReturnType<typeof vi.spyOn>
  const selectedCustomer = ref<Customer | null>(makeCustomer())
  const showErrorToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    selectedCustomer.value = makeCustomer()
    setActivePinia(createPinia())
    cartStore = useCartStore()
    productStore = useProductStore()

    // Spy on findByBarcode since it's a store action
    spyFindByBarcode = vi.spyOn(productStore, 'findByBarcode')

    scope = effectScope()
    scan = scope.run(() => useBarcodeScan({ selectedCustomer, showErrorToast }))!
  })

  afterEach(() => {
    scope.stop()
  })

  describe('initial state', () => {
    it('has correct defaults', () => {
      expect(scan.showScanner.value).toBe(false)
    })
  })

  describe('handleBarcodeScan', () => {
    it('adds product to cart on successful scan', async () => {
      const product = makeProduct({ moq_unit: 'box', moq_quantity: 1 })
      spyFindByBarcode.mockResolvedValue({
        success: true,
        product,
        scanned_unit: 'box',
      })

      await scan.handleBarcodeScan('1234567890')

      expect(spyFindByBarcode).toHaveBeenCalledWith('1234567890', 1)
      expect(cartStore.items).toHaveLength(1)
      expect(scan.showScanner.value).toBe(false)
    })

    it('shows error toast when product not found', async () => {
      spyFindByBarcode.mockResolvedValue({
        success: false,
        product: null,
        scanned_unit: null,
      })

      await scan.handleBarcodeScan('0000000000')

      expect(showErrorToast).toHaveBeenCalledWith('Ürün bulunamadı')
      expect(cartStore.items).toHaveLength(0)
    })

    it('does nothing when no customer selected', async () => {
      selectedCustomer.value = null

      await scan.handleBarcodeScan('1234567890')

      expect(spyFindByBarcode).not.toHaveBeenCalled()
    })

    it('uses scanned_unit for unit type', async () => {
      const product = makeProduct({ moq_unit: 'piece', moq_quantity: 5 })
      spyFindByBarcode.mockResolvedValue({
        success: true,
        product,
        scanned_unit: 'piece',
      })

      const spyAddItem = vi.spyOn(cartStore, 'addItem')
      await scan.handleBarcodeScan('1234567890')

      expect(spyAddItem).toHaveBeenCalledWith(product, 5, 'piece')
    })

    it('falls back to moq_unit when no scanned_unit', async () => {
      const product = makeProduct({ moq_unit: 'box', moq_quantity: 2 })
      spyFindByBarcode.mockResolvedValue({
        success: true,
        product,
        scanned_unit: null,
      })

      const spyAddItem = vi.spyOn(cartStore, 'addItem')
      await scan.handleBarcodeScan('1234567890')

      expect(spyAddItem).toHaveBeenCalledWith(product, 2, 'box')
    })
  })

  describe('handleKeyDown (via mounted component)', () => {
    let wrapper: ReturnType<typeof mount>
    let mountedProductStore: ReturnType<typeof useProductStore>
    let mountedSpyFindByBarcode: ReturnType<typeof vi.spyOn>
    const mountedSelectedCustomer = ref<Customer | null>(makeCustomer())
    const mountedShowErrorToast = vi.fn()

    function mountWithBarcodeScan() {
      const WrapperComponent = defineComponent({
        setup() {
          const scan = useBarcodeScan({
            selectedCustomer: mountedSelectedCustomer,
            showErrorToast: mountedShowErrorToast,
          })
          return { scan }
        },
        render() { return h('div') },
      })
      return mount(WrapperComponent)
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.clearAllMocks()
      mountedSelectedCustomer.value = makeCustomer()
      setActivePinia(createPinia())
      mountedProductStore = useProductStore()
      mountedSpyFindByBarcode = vi.spyOn(mountedProductStore, 'findByBarcode')
      wrapper = mountWithBarcodeScan()
    })

    afterEach(() => {
      wrapper.unmount()
      vi.useRealTimers()
    })

    function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }))
    }

    it('triggers scan on Enter with 4+ chars buffer', async () => {
      const product = makeProduct()
      mountedSpyFindByBarcode.mockResolvedValue({ success: true, product, scanned_unit: 'box' })

      dispatchKey('1')
      dispatchKey('2')
      dispatchKey('3')
      dispatchKey('4')
      dispatchKey('Enter')

      await flushPromises()
      expect(mountedSpyFindByBarcode).toHaveBeenCalledWith('1234', 1)
    })

    it('does not trigger scan on Enter with less than 4 chars', async () => {
      dispatchKey('1')
      dispatchKey('2')
      dispatchKey('Enter')

      await flushPromises()
      expect(mountedSpyFindByBarcode).not.toHaveBeenCalled()
    })

    it('ignores keystrokes with ctrl modifier', () => {
      dispatchKey('a', { ctrlKey: true })
      dispatchKey('b', { ctrlKey: true })
      dispatchKey('c', { ctrlKey: true })
      dispatchKey('d', { ctrlKey: true })
      dispatchKey('Enter')

      expect(mountedSpyFindByBarcode).not.toHaveBeenCalled()
    })

    it('ignores keystrokes with meta modifier', () => {
      dispatchKey('a', { metaKey: true })
      dispatchKey('b', { metaKey: true })
      dispatchKey('c', { metaKey: true })
      dispatchKey('d', { metaKey: true })
      dispatchKey('Enter')

      expect(mountedSpyFindByBarcode).not.toHaveBeenCalled()
    })

    it('ignores keystrokes when target is an input element', () => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      expect(mountedSpyFindByBarcode).not.toHaveBeenCalled()
      document.body.removeChild(input)
    })

    it('clears barcode buffer after 100ms timeout', async () => {
      dispatchKey('1')
      dispatchKey('2')

      // Wait for buffer to clear
      vi.advanceTimersByTime(150)

      // Start fresh sequence — only 2 chars since buffer was cleared
      dispatchKey('A')
      dispatchKey('B')
      dispatchKey('Enter')

      await flushPromises()
      expect(mountedSpyFindByBarcode).not.toHaveBeenCalled()
    })

    it('removes event listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      removeSpy.mockRestore()
    })
  })

})
