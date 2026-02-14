import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from './cart'
import type { Product, Customer, Order, ReturnableOrder } from '@/types'

// Minimal product factory
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Test Product',
    sku: 'TP-001',
    barcode: null,
    barcode_box: null,
    image_url: null,
    base_price: 10,
    price_list_price: 10,
    price_list_discount: 0,
    price_list_discount_percent: 0,
    promotion_discount: 0,
    promotion_discount_percent: 0,
    customer_price: 10,
    total_discount: 0,
    total_discount_percent: 0,
    pricing_source: 'base',
    promotion_id: null,
    promotion_name: null,
    promotion_type: null,
    promotion_value: null,
    pieces_per_box: 12,
    piece_price: 10,
    box_price: 120,
    allow_broken_case: true,
    broken_case_discount: 0,
    broken_case_piece_price: 10,
    vat_rate: { id: 1, rate: 18 },
    stock_quantity: 100,
    availability_status: 'in_stock',
    can_purchase: true,
    boxes_per_case: 1,
    moq_quantity: 1,
    moq_unit: 'piece',
    ...overrides,
  }
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    company_name: 'Test Company',
    contact_name: 'John',
    contact_email: 'john@test.com',
    contact_phone: '555-0100',
    customer_tier: 'gold',
    ...overrides,
  }
}

describe('cart store', () => {
  let cart: ReturnType<typeof useCartStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    cart = useCartStore()
  })

  // --- addItem ---
  describe('addItem', () => {
    it('adds a new item to the cart', () => {
      cart.addItem(makeProduct(), 1, 'box')
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].product_id).toBe(1)
      expect(cart.items[0].price).toBe(120) // box_price
      expect(cart.items[0].unit_type).toBe('box')
    })

    it('increments quantity for duplicate product', () => {
      const product = makeProduct()
      cart.addItem(product, 2, 'box')
      cart.addItem(product, 3, 'box')
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].quantity).toBe(5)
    })

    it('adds piece unit type with piece price', () => {
      cart.addItem(makeProduct({ broken_case_piece_price: 11 }), 1, 'piece')
      expect(cart.items[0].price).toBe(11)
      expect(cart.items[0].unit_type).toBe('piece')
    })

    it('prepends new items (unshift)', () => {
      cart.addItem(makeProduct({ id: 1, name: 'First' }), 1, 'box')
      cart.addItem(makeProduct({ id: 2, name: 'Second' }), 1, 'box')
      expect(cart.items[0].name).toBe('Second')
    })
  })

  // --- updateQuantity ---
  describe('updateQuantity', () => {
    beforeEach(() => {
      cart.addItem(makeProduct(), 3, 'box')
    })

    it('updates quantity', () => {
      cart.updateQuantity(0, 5)
      expect(cart.items[0].quantity).toBe(5)
    })

    it('removes item when quantity <= 0', () => {
      cart.updateQuantity(0, 0)
      expect(cart.items).toHaveLength(0)
    })

    it('applies custom price', () => {
      cart.updateQuantity(0, 3, { custom: 99 })
      expect(cart.items[0].price).toBe(99)
    })

    it('updates box and piece prices', () => {
      cart.updateQuantity(0, 3, { box: 200, piece: 17 })
      expect(cart.items[0].box_price).toBe(200)
      expect(cart.items[0].broken_case_piece_price).toBe(17)
    })
  })

  // --- updateItemUnitType ---
  describe('updateItemUnitType', () => {
    it('switches from box to piece', () => {
      cart.addItem(makeProduct({ box_price: 120, broken_case_piece_price: 10 }), 1, 'box')
      cart.updateItemUnitType(0, 'piece')
      expect(cart.items[0].unit_type).toBe('piece')
      expect(cart.items[0].price).toBe(10)
    })

    it('switches from piece to box', () => {
      cart.addItem(makeProduct({ box_price: 120, broken_case_piece_price: 10 }), 1, 'piece')
      cart.updateItemUnitType(0, 'box')
      expect(cart.items[0].unit_type).toBe('box')
      expect(cart.items[0].price).toBe(120)
    })

    it('does nothing for invalid index', () => {
      cart.addItem(makeProduct(), 1, 'box')
      cart.updateItemUnitType(99, 'piece')
      expect(cart.items[0].unit_type).toBe('box')
    })
  })

  // --- removeItem / undoRemove ---
  describe('removeItem & undoRemove', () => {
    it('removes an item and stores it for undo', () => {
      cart.addItem(makeProduct(), 1, 'box')
      cart.removeItem(0)
      expect(cart.items).toHaveLength(0)
      expect(cart.lastRemovedItem).not.toBeNull()
    })

    it('restores removed item with undoRemove', () => {
      cart.addItem(makeProduct(), 2, 'box')
      cart.removeItem(0)
      cart.undoRemove()
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].quantity).toBe(2)
      expect(cart.lastRemovedItem).toBeNull()
    })

    it('undoRemove does nothing when nothing was removed', () => {
      cart.undoRemove()
      expect(cart.items).toHaveLength(0)
    })
  })

  // --- cartAggregates ---
  describe('cartAggregates', () => {
    it('computes totals for mixed box and piece items', () => {
      // Box item: price=120, qty=2, vat=18%
      cart.addItem(makeProduct({ id: 1, box_price: 120, vat_rate: { id: 1, rate: 18 } }), 2, 'box')
      // Piece item: price=10, qty=5, vat=9%
      cart.addItem(makeProduct({ id: 2, broken_case_piece_price: 10, vat_rate: { id: 2, rate: 9 } }), 5, 'piece')

      expect(cart.totalQuantity).toBe(7)
      expect(cart.boxCount).toBe(2)
      expect(cart.pieceCount).toBe(5)
      // subtotal = 120*2 + 10*5 = 290
      expect(cart.subtotal).toBe(290)
      // vat = 240*0.18 + 50*0.09 = 43.2 + 4.5 = 47.7
      expect(cart.vatTotal).toBeCloseTo(47.7)
      // total = 290 + 47.7 = 337.7
      expect(cart.total).toBeCloseTo(337.7)
      // vat breakdown sorted by rate
      expect(cart.vatBreakdown).toHaveLength(2)
      expect(cart.vatBreakdown[0].rate).toBe(9)
      expect(cart.vatBreakdown[1].rate).toBe(18)
    })

    it('returns zeros for empty cart', () => {
      expect(cart.subtotal).toBe(0)
      expect(cart.vatTotal).toBe(0)
      expect(cart.total).toBe(0)
      expect(cart.isEmpty).toBe(true)
    })
  })

  // --- getOrderPayload ---
  describe('getOrderPayload', () => {
    it('throws when no customer is set', () => {
      cart.addItem(makeProduct(), 1, 'box')
      expect(() => cart.getOrderPayload()).toThrow('Customer is required')
    })

    it('returns normal order payload', () => {
      cart.setCustomer(makeCustomer())
      cart.addItem(makeProduct(), 2, 'box')

      const payload = cart.getOrderPayload()
      expect(payload.customer_id).toBe(1)
      expect(payload.items).toHaveLength(1)
      expect(payload.items[0].quantity).toBe(2)
      expect(payload.items[0].unit_type).toBe('box')
      expect(payload.type).toBeUndefined()
    })

    it('returns return order payload in return mode', () => {
      cart.setCustomer(makeCustomer())
      cart.enterReturnMode()
      cart.items.push({
        product_id: 1,
        name: 'Return Item',
        sku: 'RI-001',
        image_url: null,
        price: 50,
        base_price: 50,
        total_discount: 0,
        total_discount_percent: 0,
        quantity: 3,
        unit_type: 'piece',
        pieces_per_box: 1,
        vat_rate: 18,
      })

      const payload = cart.getOrderPayload()
      expect(payload.type).toBe('return')
      expect(payload.items).toHaveLength(1)
    })
  })

  // --- setCustomer ---
  describe('setCustomer', () => {
    it('clears cart when customer changes', () => {
      cart.addItem(makeProduct(), 1, 'box')
      cart.setCustomer(makeCustomer({ id: 10 }))
      expect(cart.items).toHaveLength(0)
      expect(cart.customerId).toBe(10)
    })

    it('does not clear cart when same customer is set', () => {
      cart.setCustomer(makeCustomer({ id: 10 }))
      cart.addItem(makeProduct(), 1, 'box')
      cart.setCustomer(makeCustomer({ id: 10 }))
      expect(cart.items).toHaveLength(1)
    })

    it('accepts numeric customer ID', () => {
      cart.setCustomer(5)
      expect(cart.customerId).toBe(5)
      expect(cart.customer).toBeNull()
    })
  })

  // --- loadOrderForEditing ---
  describe('loadOrderForEditing', () => {
    it('maps order items to cart items', () => {
      const order: Order = {
        id: 100,
        order_number: 'ORD-100',
        customer_id: 1,
        customer: makeCustomer(),
        items: [
          {
            id: 1,
            product_id: 10,
            product: { id: 10, name: 'Widget', sku: 'W-001', image_url: null, pieces_per_box: 6 },
            quantity_ordered: 3,
            unit_price: 50,
            original_price: 55,
            unit_type: 'box',
            pieces_per_box: 6,
            vat_rate: 18,
            line_total: 150,
          },
        ],
        subtotal: 150,
        discount_total: 0,
        vat_total: 27,
        total: 177,
        notes: 'Test order',
        status: 'pending',
        created_at: '2025-01-01',
      }

      cart.loadOrderForEditing(order)
      expect(cart.editingOrderId).toBe(100)
      expect(cart.customerId).toBe(1)
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].product_id).toBe(10)
      expect(cart.items[0].quantity).toBe(3)
      expect(cart.items[0].unit_type).toBe('box')
      expect(cart.notes).toBe('Test order')
    })
  })

  // --- totalDiscount with promotions ---
  describe('totalDiscount with promotions', () => {
    it('includes promotion discount_amount in totalDiscount', () => {
      cart.addItem(makeProduct({ id: 1, total_discount: 2 }), 1, 'box')
      cart.setAppliedPromotions([
        { id: 10, name: 'Promo A', discount_amount: 5 } as any,
        { id: 11, name: 'Promo B', discount_amount: 3 } as any,
      ])
      // item discount: 2 * 1 = 2, promotion discounts: 5 + 3 = 8, total = 10
      expect(cart.totalDiscount).toBe(10)
    })

    it('handles promotions with no discount_amount', () => {
      cart.addItem(makeProduct({ id: 1, total_discount: 1 }), 2, 'box')
      cart.setAppliedPromotions([
        { id: 10, name: 'Promo' } as any,
      ])
      // item discount: 1 * 2 = 2, promotion discount_amount is undefined → 0
      expect(cart.totalDiscount).toBe(2)
    })
  })

  // --- setAppliedPromotions / setCouponCode ---
  describe('setAppliedPromotions / setCouponCode', () => {
    it('sets promotions', () => {
      const promos = [{ id: 1, name: 'Test' }] as any
      cart.setAppliedPromotions(promos)
      expect(cart.appliedPromotions).toEqual(promos)
    })

    it('sets coupon code', () => {
      cart.setCouponCode('SAVE10')
      expect(cart.couponCode).toBe('SAVE10')
    })

    it('clears coupon code with null', () => {
      cart.setCouponCode('SAVE10')
      cart.setCouponCode(null)
      expect(cart.couponCode).toBeNull()
    })
  })

  // --- getOrderPayload return mode with reference ---
  describe('getOrderPayload return mode with reference', () => {
    it('includes return_reference_order_id in return mode payload', () => {
      cart.setCustomer(makeCustomer())
      cart.enterReturnMode()
      cart.returnReferenceOrderId = 999
      cart.items.push({
        product_id: 1, name: 'R', sku: 'R-1', image_url: null,
        price: 50, base_price: 50, total_discount: 0, total_discount_percent: 0,
        quantity: 2, unit_type: 'piece', pieces_per_box: 1, vat_rate: 18,
      })

      const payload = cart.getOrderPayload()
      expect(payload.type).toBe('return')
      expect(payload.return_reference_order_id).toBe(999)
    })

    it('includes applied_promotions in normal mode payload', () => {
      cart.setCustomer(makeCustomer())
      cart.addItem(makeProduct(), 1, 'box')
      cart.setAppliedPromotions([{ id: 5, name: 'P', discount_amount: 10 } as any])

      const payload = cart.getOrderPayload()
      expect(payload.applied_promotions).toHaveLength(1)
      expect(payload.applied_promotions![0].promotion_id).toBe(5)
      expect(payload.applied_promotions![0].discount_amount).toBe(10)
    })
  })

  // --- clearLastRemoved ---
  describe('clearLastRemoved', () => {
    it('clears the last removed item', () => {
      cart.addItem(makeProduct(), 1, 'box')
      cart.removeItem(0)
      expect(cart.lastRemovedItem).not.toBeNull()

      cart.clearLastRemoved()
      expect(cart.lastRemovedItem).toBeNull()
    })
  })

  // --- setNotes ---
  describe('setNotes', () => {
    it('setNotes updates notes value', () => {
      cart.setNotes('test note')
      expect(cart.notes).toBe('test note')
    })
  })

  // --- Return mode ---
  describe('return mode', () => {
    it('enterReturnMode sets flag and clears cart', () => {
      cart.addItem(makeProduct(), 1, 'box')
      cart.enterReturnMode()
      expect(cart.returnMode).toBe(true)
      expect(cart.items).toHaveLength(0)
    })

    it('exitReturnMode clears flag and cart', () => {
      cart.enterReturnMode()
      cart.exitReturnMode()
      expect(cart.returnMode).toBe(false)
      expect(cart.returnReferenceOrderId).toBeNull()
    })

    it('loadReturnItems populates cart from returnable order', () => {
      cart.enterReturnMode()
      const returnOrder: ReturnableOrder = {
        id: 200,
        order_number: 'ORD-200',
        created_at: '2025-01-01',
        total_amount: 500,
        status: 'delivered',
        already_returned: false,
        items: [
          {
            product_id: 5,
            product_name: 'Returnable Widget',
            product_sku: 'RW-005',
            image_url: null,
            quantity_ordered: 10,
            quantity_returnable: 7,
            unit_price: 50,
            original_price: 55,
            unit_type: 'box',
            vat_rate: 18,
          },
          {
            product_id: 6,
            product_name: 'Zero Returnable',
            product_sku: 'ZR-006',
            image_url: null,
            quantity_ordered: 5,
            quantity_returnable: 0,
            unit_price: 30,
            original_price: 30,
            unit_type: 'piece',
            vat_rate: 9,
          },
        ],
      }

      cart.loadReturnItems(returnOrder)
      expect(cart.returnReferenceOrderId).toBe(200)
      // Only items with quantity_returnable > 0
      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].product_id).toBe(5)
      expect(cart.items[0].quantity).toBe(7)
    })
  })
})
