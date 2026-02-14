/**
 * Dialog component tests for POS dialogs.
 *
 * Note: reka-ui (Dialog) uses Teleport which renders outside the wrapper.
 * We test with `attachTo: document.body` and query `document.body` for dialog content.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import OrderSuccessDialog from './OrderSuccessDialog.vue'
import ClearCartDialog from './ClearCartDialog.vue'
import CheckoutConfirmDialog from './CheckoutConfirmDialog.vue'
import OutOfStockDialog from './OutOfStockDialog.vue'
import ReturnableOrdersDialog from './ReturnableOrdersDialog.vue'
import ProductDetailDialog from './ProductDetailDialog.vue'
import CartSummary from './CartSummary.vue'
import type { Product, ReturnableOrder } from '@/types'

// Stub Tauri modules used by auth store
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), save: vi.fn() }),
}))
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockResolvedValue('macos'),
  arch: vi.fn().mockResolvedValue('aarch64'),
}))
vi.mock('@sentry/vue', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))
vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  authApi: {},
  customerApi: {},
  orderApi: {},
  productApi: {},
  categoryApi: {},
  promotionApi: {},
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

describe('OrderSuccessDialog', () => {
  it('renders with order number', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'ORD-042',
        savedOffline: false,
        isUpdate: false,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('ORD-042')
    expect(body).toContain('Sipariş Verildi!')
    wrapper.unmount()
  })

  it('shows offline text when savedOffline', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'OFFLINE-1',
        savedOffline: true,
        isUpdate: false,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Sipariş Kaydedildi!')
    expect(body).toContain('çevrimdışı')
    wrapper.unmount()
  })

  it('shows update text when isUpdate', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'ORD-100',
        savedOffline: false,
        isUpdate: true,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Sipariş Güncellendi!')
    wrapper.unmount()
  })

  it('shows return text when isReturn', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'ORD-200',
        savedOffline: false,
        isUpdate: false,
        isReturn: true,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('İade Oluşturuldu!')
    wrapper.unmount()
  })

  it('emits close on continue button', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'ORD-001',
        savedOffline: false,
        isUpdate: false,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    // Find button with "Alışverişe Devam Et"
    const buttons = document.body.querySelectorAll('button')
    const continueBtn = Array.from(buttons).find(b => b.textContent?.includes('Devam Et'))
    expect(continueBtn).toBeTruthy()
    continueBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('emits viewOrder on view button', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'ORD-001',
        savedOffline: false,
        isUpdate: false,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const viewBtn = Array.from(buttons).find(b => b.textContent?.includes('Görüntüle'))
    expect(viewBtn).toBeTruthy()
    viewBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('viewOrder')).toBeTruthy()
    wrapper.unmount()
  })

  it('emits viewOrder when savedOffline is false and view button clicked', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'ORD-VIEW',
        savedOffline: false,
        isUpdate: false,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    // "Siparişi Görüntüle" button should be visible when savedOffline=false
    const buttons = document.body.querySelectorAll('button')
    const viewBtn = Array.from(buttons).find(b => b.textContent?.includes('Siparişi Görüntüle'))
    expect(viewBtn).toBeTruthy()
    viewBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('viewOrder')).toBeTruthy()
    expect(wrapper.emitted('viewOrder')!.length).toBe(1)
    wrapper.unmount()
  })

  it('does not render view order button when savedOffline is true', async () => {
    const wrapper = mount(OrderSuccessDialog, {
      props: {
        open: true,
        orderNumber: 'OFFLINE-2',
        savedOffline: true,
        isUpdate: false,
        isReturn: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const viewBtn = Array.from(buttons).find(b => b.textContent?.includes('Siparişi Görüntüle'))
    expect(viewBtn).toBeFalsy()
    wrapper.unmount()
  })
})

describe('ClearCartDialog', () => {
  it('renders item count', async () => {
    const wrapper = mount(ClearCartDialog, {
      props: { open: true, itemCount: 5 },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('5')
    expect(body).toContain('Sepeti Temizle')
    wrapper.unmount()
  })

  it('emits confirm on clear button', async () => {
    const wrapper = mount(ClearCartDialog, {
      props: { open: true, itemCount: 3 },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const clearBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Sepeti Temizle')
    expect(clearBtn).toBeTruthy()
    clearBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('confirm')).toBeTruthy()
    wrapper.unmount()
  })
})

describe('CheckoutConfirmDialog', () => {
  it('renders normal checkout dialog', async () => {
    const wrapper = mount(CheckoutConfirmDialog, {
      props: {
        open: true,
        isEditMode: false,
        isReturnMode: false,
        itemCount: 3,
        total: 150,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Sipariş Onayla')
    expect(body).toContain('3 ürün')
    wrapper.unmount()
  })

  it('renders edit mode dialog', async () => {
    const wrapper = mount(CheckoutConfirmDialog, {
      props: {
        open: true,
        isEditMode: true,
        isReturnMode: false,
        itemCount: 2,
        total: 100,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Siparişi Güncelle')
    wrapper.unmount()
  })

  it('renders return mode dialog', async () => {
    const wrapper = mount(CheckoutConfirmDialog, {
      props: {
        open: true,
        isEditMode: false,
        isReturnMode: true,
        itemCount: 1,
        total: 50,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('İade Onayla')
    wrapper.unmount()
  })

  it('emits confirm on confirm button', async () => {
    const wrapper = mount(CheckoutConfirmDialog, {
      props: {
        open: true,
        isEditMode: false,
        isReturnMode: false,
        itemCount: 1,
        total: 10,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const confirmBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Onayla')
    expect(confirmBtn).toBeTruthy()
    confirmBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('confirm')).toBeTruthy()
    wrapper.unmount()
  })
})

describe('OutOfStockDialog', () => {
  it('renders product name', async () => {
    const product = makeProduct({ name: 'Widget X' })
    const wrapper = mount(OutOfStockDialog, {
      props: { open: true, product, isUpdating: false },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Widget X')
    expect(body).toContain('Stokta Yok')
    wrapper.unmount()
  })

  it('emits setAvailability with backorder', async () => {
    const product = makeProduct()
    const wrapper = mount(OutOfStockDialog, {
      props: { open: true, product, isUpdating: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const backorderBtn = Array.from(buttons).find(b => b.textContent?.includes('Stoğa Bağlı'))
    expect(backorderBtn).toBeTruthy()
    backorderBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('setAvailability')?.[0]).toEqual(['backorder'])
    wrapper.unmount()
  })

  it('emits setAvailability with preorder', async () => {
    const product = makeProduct()
    const wrapper = mount(OutOfStockDialog, {
      props: { open: true, product, isUpdating: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const preorderBtn = Array.from(buttons).find(b => b.textContent?.includes('Ön Sipariş'))
    expect(preorderBtn).toBeTruthy()
    preorderBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('setAvailability')?.[0]).toEqual(['preorder'])
    wrapper.unmount()
  })

  it('shows loading overlay when updating', async () => {
    const product = makeProduct()
    const wrapper = mount(OutOfStockDialog, {
      props: { open: true, product, isUpdating: true },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('animate-spin')
    wrapper.unmount()
  })

  it('emits update:open with false when cancel button clicked', async () => {
    const product = makeProduct({ name: 'Cancel Test' })
    const wrapper = mount(OutOfStockDialog, {
      props: { open: true, product, isUpdating: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const cancelBtn = Array.from(buttons).find(b => b.textContent?.includes('İptal'))
    expect(cancelBtn).toBeTruthy()
    cancelBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
    wrapper.unmount()
  })
})

function makeReturnableOrder(overrides: Partial<ReturnableOrder> = {}): ReturnableOrder {
  return {
    id: 1,
    order_number: 'ORD-001',
    created_at: '2024-01-15T10:00:00Z',
    total_amount: 150,
    status: 'delivered',
    already_returned: false,
    items: [{
      product_id: 1,
      product_name: 'Product A',
      product_sku: 'SKU-A',
      image_url: null,
      quantity_ordered: 10,
      quantity_returnable: 10,
      original_price: 15,
      unit_price: 15,
      unit_type: 'box',
      vat_rate: 18,
    }],
    ...overrides,
  }
}

describe('ReturnableOrdersDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders orders list', async () => {
    const orders = [makeReturnableOrder()]
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders, isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('ORD-001')
    expect(body).toContain('İade Edilecek Sipariş')
    wrapper.unmount()
  })

  it('shows loading state', async () => {
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders: [], isLoading: true },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('animate-spin')
    wrapper.unmount()
  })

  it('shows empty state', async () => {
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders: [], isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('İade edilebilir sipariş bulunamadı')
    wrapper.unmount()
  })

  it('disables already returned orders', async () => {
    const orders = [makeReturnableOrder({ already_returned: true })]
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders, isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Tamamı İade Edildi')
    const buttons = document.body.querySelectorAll('button[disabled]')
    expect(buttons.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('shows partial return badge', async () => {
    const orders = [makeReturnableOrder({
      items: [{
        product_id: 1,
        product_name: 'Product A',
        product_sku: 'SKU-A',
        image_url: null,
        quantity_ordered: 10,
        quantity_returnable: 5,
        original_price: 15,
        unit_price: 15,
        unit_type: 'box',
        vat_rate: 18,
      }],
    })]
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders, isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Kısmi İade')
    wrapper.unmount()
  })

  it('emits skip on skip button', async () => {
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders: [], isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const skipBtn = Array.from(buttons).find(b => b.textContent?.includes('Atla'))
    expect(skipBtn).toBeTruthy()
    skipBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('skip')).toBeTruthy()
    wrapper.unmount()
  })

  it('emits select when clicking a non-returned order', async () => {
    const order = makeReturnableOrder({ id: 10, order_number: 'ORD-SELECT', already_returned: false })
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders: [order], isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const orderBtn = Array.from(buttons).find(b => b.textContent?.includes('ORD-SELECT'))
    expect(orderBtn).toBeTruthy()
    orderBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([order])
    wrapper.unmount()
  })

  it('does not emit select when clicking an already returned order', async () => {
    const order = makeReturnableOrder({ id: 20, order_number: 'ORD-RETURNED', already_returned: true })
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders: [order], isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const orderBtn = Array.from(buttons).find(b => b.textContent?.includes('ORD-RETURNED'))
    expect(orderBtn).toBeTruthy()
    orderBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('select')).toBeFalsy()
    wrapper.unmount()
  })

  it('emits update:open with false when cancel button clicked', async () => {
    const wrapper = mount(ReturnableOrdersDialog, {
      props: { open: true, orders: [], isLoading: false },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const cancelBtn = Array.from(buttons).find(b => b.textContent?.includes('Vazgeç'))
    expect(cancelBtn).toBeTruthy()
    cancelBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
    wrapper.unmount()
  })
})

describe('ProductDetailDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders product details', async () => {
    const product = makeProduct({ name: 'Widget Pro', sku: 'WP-001', pieces_per_box: 12 })
    const wrapper = mount(ProductDetailDialog, {
      props: {
        open: true,
        product,
        history: [],
        isLoadingHistory: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Widget Pro')
    expect(body).toContain('WP-001')
    expect(body).toContain('12 adet')
    wrapper.unmount()
  })

  it('renders purchase history', async () => {
    const product = makeProduct()
    const history = [
      { date: '2024-01-15', quantity: 5, unit_type: 'box' as const, line_total_formatted: '600.00', per_piece_price_formatted: '10.00' },
    ]
    const wrapper = mount(ProductDetailDialog, {
      props: {
        open: true,
        product,
        history,
        isLoadingHistory: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('2024-01-15')
    expect(body).toContain('5 koli')
    wrapper.unmount()
  })

  it('shows empty history message', async () => {
    const product = makeProduct()
    const wrapper = mount(ProductDetailDialog, {
      props: {
        open: true,
        product,
        history: [],
        isLoadingHistory: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('Daha önce alım yapılmamış')
    wrapper.unmount()
  })

  it('shows loading state for history', async () => {
    const product = makeProduct()
    const wrapper = mount(ProductDetailDialog, {
      props: {
        open: true,
        product,
        history: [],
        isLoadingHistory: true,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('animate-spin')
    wrapper.unmount()
  })

  it('emits addToCart on button click', async () => {
    const product = makeProduct()
    const wrapper = mount(ProductDetailDialog, {
      props: {
        open: true,
        product,
        history: [],
        isLoadingHistory: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const buttons = document.body.querySelectorAll('button')
    const addBtn = Array.from(buttons).find(b => b.textContent?.includes('Sepete Ekle'))
    expect(addBtn).toBeTruthy()
    addBtn?.click()
    await flushPromises()

    expect(wrapper.emitted('addToCart')).toBeTruthy()
    wrapper.unmount()
  })

  it('renders discount pricing', async () => {
    const product = makeProduct({
      total_discount_percent: 10,
      base_price: 100,
      box_price: 1080,
      piece_price: 90,
    })
    const wrapper = mount(ProductDetailDialog, {
      props: {
        open: true,
        product,
        history: [],
        isLoadingHistory: false,
      },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.innerHTML
    expect(body).toContain('line-through')
    wrapper.unmount()
  })
})

describe('CartSummary', () => {
  it('renders subtotal and total', () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 0,
        vatTotal: 18,
        vatBreakdown: [{ rate: 18, amount: 18 }],
        total: 118,
        itemCount: 3,
        boxCount: 2,
        pieceCount: 5,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Ara Toplam')
    expect(text).toContain('KDV')
    expect(text).toContain('Toplam')
  })

  it('shows discount when present', () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 10,
        vatTotal: 16.2,
        vatBreakdown: [{ rate: 18, amount: 16.2 }],
        total: 106.2,
        itemCount: 3,
        boxCount: 2,
        pieceCount: 0,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('İndirim')
  })

  it('shows return mode styling', () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 0,
        vatTotal: 18,
        vatBreakdown: [],
        total: 118,
        itemCount: 1,
        boxCount: 1,
        pieceCount: 0,
        isReturnMode: true,
      },
    })

    const html = wrapper.html()
    expect(html).toContain('text-destructive')
    expect(wrapper.text()).toContain('İade Oluştur')
  })

  it('shows stock warnings', () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 0,
        vatTotal: 18,
        vatBreakdown: [],
        total: 118,
        itemCount: 1,
        boxCount: 0,
        pieceCount: 1,
        stockWarnings: [{ productId: 1, name: 'Widget', stock: 5 }],
      },
    })

    expect(wrapper.text()).toContain('ürün mevcut stoku aşıyor')
  })

  it('disables checkout button when canCheckout is false', () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 0,
        discount: 0,
        vatTotal: 0,
        vatBreakdown: [],
        total: 0,
        itemCount: 0,
        boxCount: 0,
        pieceCount: 0,
        canCheckout: false,
      },
    })

    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('emits checkout on button click', async () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 0,
        vatTotal: 18,
        vatBreakdown: [],
        total: 118,
        itemCount: 1,
        boxCount: 1,
        pieceCount: 0,
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('checkout')).toBeTruthy()
  })

  it('shows box and piece counts', () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 0,
        vatTotal: 18,
        vatBreakdown: [],
        total: 118,
        itemCount: 3,
        boxCount: 2,
        pieceCount: 5,
      },
    })

    expect(wrapper.text()).toContain('2 koli')
    expect(wrapper.text()).toContain('5 adet')
  })

  it('emits update:notes when notes input value changes', async () => {
    const wrapper = mount(CartSummary, {
      props: {
        subtotal: 100,
        discount: 0,
        vatTotal: 18,
        vatBreakdown: [],
        total: 118,
        itemCount: 1,
        boxCount: 1,
        pieceCount: 0,
        notes: '',
      },
    })

    // The Input component wraps a native <input>. Setting its value and triggering input
    // causes useVModel to emit update:modelValue, which CartSummary re-emits as update:notes.
    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBe(true)
    await input.setValue('Test note')

    expect(wrapper.emitted('update:notes')).toBeTruthy()
    // The emitted value should be a string
    const emitted = wrapper.emitted('update:notes')!
    expect(emitted.length).toBeGreaterThan(0)
    expect(emitted[emitted.length - 1][0]).toBe('Test note')
  })
})
