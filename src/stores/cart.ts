import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem, Product, Promotion, Customer } from '@/types'

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])
  const customerId = ref<number | null>(null)
  const customer = ref<Customer | null>(null)
  const notes = ref('')
  const appliedPromotions = ref<Promotion[]>([])
  const couponCode = ref<string | null>(null)

  // Getters
  const itemCount = computed(() => items.value.length)

  const totalQuantity = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const boxCount = computed(() =>
    items.value
      .filter(item => item.unit_type === 'box')
      .reduce((sum, item) => sum + item.quantity, 0)
  )

  const pieceCount = computed(() =>
    items.value
      .filter(item => item.unit_type === 'piece')
      .reduce((sum, item) => sum + item.quantity, 0)
  )

  // For undo feature
  const lastRemovedItem = ref<{ item: CartItem; index: number } | null>(null)

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  const totalDiscount = computed(() => {
    const itemDiscounts = items.value.reduce((sum, item) => {
      return sum + item.total_discount * item.quantity
    }, 0)

    const promotionDiscounts = appliedPromotions.value.reduce(
      (sum, promo) => sum + (promo.discount_amount || 0),
      0
    )

    return itemDiscounts + promotionDiscounts
  })

  const vatTotal = computed(() =>
    items.value.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      const vatAmount = itemTotal * (item.vat_rate / 100)
      return sum + vatAmount
    }, 0)
  )

  // Group VAT by rate for display
  const vatBreakdown = computed(() => {
    const breakdown: { rate: number; amount: number }[] = []
    const rateMap = new Map<number, number>()

    items.value.forEach(item => {
      const itemTotal = item.price * item.quantity
      const vatAmount = itemTotal * (item.vat_rate / 100)
      const current = rateMap.get(item.vat_rate) || 0
      rateMap.set(item.vat_rate, current + vatAmount)
    })

    rateMap.forEach((amount, rate) => {
      if (amount > 0) {
        breakdown.push({ rate, amount })
      }
    })

    return breakdown.sort((a, b) => a.rate - b.rate)
  })

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

  function updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      items.value.splice(index, 1)
    } else {
      items.value[index].quantity = quantity
    }
  }

  function removeItem(index: number) {
    const removed = items.value[index]
    if (removed) {
      // Deep clone the item to prevent reactivity issues
      lastRemovedItem.value = {
        item: JSON.parse(JSON.stringify(removed)),
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
    return {
      customer_id: customerId.value!,
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

  return {
    // State
    items,
    customerId,
    customer,
    notes,
    appliedPromotions,
    couponCode,
    lastRemovedItem,
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
  }
})
