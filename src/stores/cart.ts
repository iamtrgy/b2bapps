import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import type { CartItem, Product, Promotion, Customer, Order, ReturnableOrder, CreateOrderRequest } from '@/types'

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])
  const customerId = ref<number | null>(null)
  const customer = ref<Customer | null>(null)
  const notes = ref('')
  const appliedPromotions = ref<Promotion[]>([])
  const couponCode = ref<string | null>(null)
  const editingOrderId = ref<number | null>(null)
  const returnMode = ref(false)
  const returnReferenceOrderId = ref<number | null>(null)

  // For undo feature
  const lastRemovedItem = ref<{ item: CartItem; index: number } | null>(null)

  // Single-pass aggregation: computes all cart metrics in one iteration
  const cartAggregates = computed(() => {
    let totalQty = 0
    let boxes = 0
    let pieces = 0
    let sub = 0
    let disc = 0
    let vat = 0
    const vatMap = new Map<number, number>()

    for (const item of items.value) {
      const qty = item.quantity
      totalQty += qty
      if (item.unit_type === 'box') boxes += qty
      else pieces += qty

      const lineTotal = item.price * qty
      sub += lineTotal
      disc += item.total_discount * qty

      const vatAmount = lineTotal * (item.vat_rate / 100)
      vat += vatAmount
      vatMap.set(item.vat_rate, (vatMap.get(item.vat_rate) || 0) + vatAmount)
    }

    const breakdown: { rate: number; amount: number }[] = []
    vatMap.forEach((amount, rate) => {
      if (amount > 0) breakdown.push({ rate, amount })
    })
    breakdown.sort((a, b) => a.rate - b.rate)

    return { totalQty, boxes, pieces, sub, disc, vat, breakdown }
  })

  // Getters — lightweight accessors into the single-pass aggregate
  const itemCount = computed(() => items.value.length)
  const totalQuantity = computed(() => cartAggregates.value.totalQty)
  const boxCount = computed(() => cartAggregates.value.boxes)
  const pieceCount = computed(() => cartAggregates.value.pieces)
  const subtotal = computed(() => cartAggregates.value.sub)

  const totalDiscount = computed(() => {
    const promotionDiscounts = appliedPromotions.value.reduce(
      (sum, promo) => sum + (promo.discount_amount || 0),
      0
    )
    return cartAggregates.value.disc + promotionDiscounts
  })

  const vatTotal = computed(() => cartAggregates.value.vat)
  const vatBreakdown = computed(() => cartAggregates.value.breakdown)
  const total = computed(() => subtotal.value + vatTotal.value)
  const isEmpty = computed(() => items.value.length === 0)

  // Actions
  function addItem(product: Product, quantity = 1, unitType: 'piece' | 'box' = 'box') {
    // Check if product already exists with ANY unit type
    const existing = items.value.find(
      (item) => item.product_id === product.id
    )

    if (existing) {
      // Product already in cart - just increase quantity (keep existing unit type)
      existing.quantity += quantity
    } else {
      // Use prices directly from API
      const unitPrice = unitType === 'box'
        ? product.box_price
        : product.broken_case_piece_price

      items.value.unshift({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        image_url: product.image_url,
        price: unitPrice,
        base_price: product.base_price,
        total_discount: product.total_discount,
        total_discount_percent: product.total_discount_percent,
        quantity,
        unit_type: unitType,
        pieces_per_box: product.pieces_per_box,
        vat_rate: product.vat_rate?.rate || 0,
        // Broken case support
        allow_broken_case: product.allow_broken_case,
        broken_case_piece_price: product.broken_case_piece_price,
        box_price: product.box_price,
        // Availability status
        availability_status: product.availability_status,
        allow_backorder: product.allow_backorder,
        is_preorder: product.is_preorder,
        stock_quantity: product.stock_quantity,
      })
    }
  }

  function updateItemUnitType(index: number, unitType: 'piece' | 'box') {
    const item = items.value[index]
    if (!item) return

    // Update unit type and price
    item.unit_type = unitType
    item.price = unitType === 'box'
      ? (item.box_price || item.price)
      : (item.broken_case_piece_price || item.price)
  }

  function updateQuantity(index: number, quantity: number, prices?: { custom?: number; box?: number; piece?: number }) {
    if (quantity <= 0) {
      items.value.splice(index, 1)
    } else {
      items.value[index].quantity = quantity
      if (prices?.custom !== undefined && prices.custom > 0) {
        items.value[index].price = prices.custom
      }
      if (prices?.box !== undefined && prices.box > 0) {
        items.value[index].box_price = prices.box
      }
      if (prices?.piece !== undefined && prices.piece > 0) {
        items.value[index].broken_case_piece_price = prices.piece
      }
    }
  }

  function removeItem(index: number) {
    const removed = items.value[index]
    if (removed) {
      lastRemovedItem.value = {
        item: structuredClone(toRaw(removed)),
        index
      }
      items.value.splice(index, 1)
    }
  }

  function undoRemove() {
    if (lastRemovedItem.value) {
      const { item, index } = lastRemovedItem.value
      // Restore at original index if valid, otherwise add to beginning
      const restoreIndex = Math.min(index, items.value.length)
      items.value.splice(restoreIndex, 0, { ...item })
      lastRemovedItem.value = null
    }
  }

  function clearLastRemoved() {
    lastRemovedItem.value = null
  }

  function setCustomer(customerData: Customer | number) {
    const id = typeof customerData === 'number' ? customerData : customerData.id
    if (customerId.value !== id) {
      customerId.value = id
      customer.value = typeof customerData === 'number' ? null : customerData
      // Clear cart when customer changes (prices may differ)
      clear()
    } else if (typeof customerData !== 'number') {
      // Update customer data even if ID is same
      customer.value = customerData
    }
  }

  function setNotes(value: string) {
    notes.value = value
  }

  function setAppliedPromotions(promotions: Promotion[]) {
    appliedPromotions.value = promotions
  }

  function setCouponCode(code: string | null) {
    couponCode.value = code
  }

  function clear() {
    items.value = []
    notes.value = ''
    appliedPromotions.value = []
    couponCode.value = null
  }

  function getOrderPayload() {
    if (!customerId.value) {
      throw new Error('Customer is required')
    }

    if (returnMode.value) {
      const payload: CreateOrderRequest = {
        customer_id: customerId.value,
        type: 'return',
        items: items.value.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          base_price: item.base_price,
          unit_type: item.unit_type,
          pieces_per_box: item.pieces_per_box,
          vat_rate: item.vat_rate,
        })),
        notes: notes.value || undefined,
        return_reference_order_id: returnReferenceOrderId.value ?? undefined,
      }
      return payload
    }

    return {
      customer_id: customerId.value,
      items: items.value.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        base_price: item.base_price,
        unit_type: item.unit_type,
        pieces_per_box: item.pieces_per_box,
        vat_rate: item.vat_rate,
      })),
      notes: notes.value || undefined,
      applied_promotions: appliedPromotions.value.map((promo) => ({
        promotion_id: promo.id,
        discount_amount: promo.discount_amount || 0,
      })),
    }
  }

  function loadOrderForEditing(order: Order) {
    editingOrderId.value = order.id

    // Set customer without clearing cart
    const cId = order.customer_id || order.customer?.id
    if (cId) {
      customerId.value = cId
      customer.value = order.customer || null
    }

    // Map OrderItem[] to CartItem[]
    items.value = order.items.map((item) => ({
      product_id: item.product_id || item.product?.id || 0,
      name: item.product?.name || '',
      sku: item.product?.sku || '',
      image_url: item.product?.image_url || null,
      price: item.unit_price,
      base_price: item.unit_type === 'box'
        ? item.unit_price / (item.pieces_per_box || item.product?.pieces_per_box || 1)
        : item.unit_price,
      total_discount: 0,
      total_discount_percent: 0,
      quantity: item.quantity_ordered,
      unit_type: item.unit_type,
      pieces_per_box: item.pieces_per_box || item.product?.pieces_per_box || 1,
      vat_rate: item.vat_rate,
      allow_broken_case: false,
      broken_case_piece_price: item.unit_type === 'piece' ? item.unit_price : 0,
      box_price: item.unit_type === 'box' ? item.unit_price : 0,
      availability_status: item.availability_status,
      allow_backorder: item.allow_backorder,
      is_preorder: item.is_preorder,
    }))

    notes.value = order.notes || ''
    appliedPromotions.value = []
    couponCode.value = null
  }

  function clearEditMode() {
    editingOrderId.value = null
  }

  function enterReturnMode() {
    returnMode.value = true
    clear()
  }

  function exitReturnMode() {
    returnMode.value = false
    returnReferenceOrderId.value = null
    clear()
  }

  function loadReturnItems(order: ReturnableOrder) {
    returnReferenceOrderId.value = order.id

    items.value = order.items
      .filter(item => (item.quantity_returnable ?? item.quantity_ordered) > 0)
      .map((item) => ({
        product_id: item.product_id,
        name: item.product_name,
        sku: item.product_sku,
        image_url: item.image_url,
        price: item.unit_price,
        base_price: item.original_price ?? item.unit_price,
        total_discount: 0,
        total_discount_percent: 0,
        quantity: item.quantity_returnable ?? item.quantity_ordered,
        unit_type: item.unit_type,
        pieces_per_box: 1,
        vat_rate: item.vat_rate,
      }))

    notes.value = ''
    appliedPromotions.value = []
    couponCode.value = null
  }

  return {
    // State
    items,
    customerId,
    customer,
    notes,
    appliedPromotions,
    couponCode,
    lastRemovedItem,
    editingOrderId,
    returnMode,
    returnReferenceOrderId,
    // Getters
    itemCount,
    totalQuantity,
    boxCount,
    pieceCount,
    subtotal,
    totalDiscount,
    vatTotal,
    vatBreakdown,
    total,
    isEmpty,
    // Actions
    addItem,
    updateQuantity,
    updateItemUnitType,
    removeItem,
    undoRemove,
    clearLastRemoved,
    setCustomer,
    setNotes,
    setAppliedPromotions,
    setCouponCode,
    clear,
    getOrderPayload,
    loadOrderForEditing,
    clearEditMode,
    enterReturnMode,
    exitReturnMode,
    loadReturnItems,
  }
})
