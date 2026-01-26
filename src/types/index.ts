// Tenant types
export interface Tenant {
  id: string
  name: string
  company_name: string
  logo_url: string | null
  api_base_url: string
  // Feature flags
  afas_enabled?: boolean
  broken_case_enabled?: boolean
  broken_case_discount?: number
}

// User types
export interface User {
  id: number
  name: string
  email: string
  role: string
}

export interface UserPermissions {
  can_create_orders: boolean
  can_view_all_customers: boolean
  can_apply_discounts: boolean
  can_assign_barcodes: boolean
}

// Customer types
export interface CustomerAddress {
  address: string
  city: string
  state?: string
  postal_code: string
  country: string
}

export interface CustomerRecentOrder {
  id: number
  order_number: string
  status: string
  total: number
  created_at: string
}

export interface Customer {
  id: number
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  customer_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  credit_limit?: number
  current_balance?: number
  available_credit?: number
  total_orders?: number
  total_spent?: number
  vat_number?: string
  city?: string
  billing_address?: CustomerAddress
  shipping_address?: CustomerAddress
  recent_orders?: CustomerRecentOrder[]
}

// Category types
export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string | null
  parent_id?: number | null
  product_count: number
  has_children?: boolean
  children?: Category[]
}

// Product types
export interface VatRate {
  id: number
  name?: string
  rate: number
}

export interface Product {
  id: number
  name: string
  sku: string
  barcode: string | null
  barcode_box: string | null
  image_url: string | null
  // Pricing breakdown
  base_price: number
  price_list_price: number
  price_list_discount: number
  price_list_discount_percent: number
  promotion_discount: number
  promotion_discount_percent: number
  customer_price: number
  total_discount: number
  total_discount_percent: number
  pricing_source: string
  // Promotion info
  promotion_id: number | null
  promotion_name: string | null
  promotion_type: string | null
  promotion_value: number | null
  // Unit prices
  pieces_per_box: number
  piece_price: number
  box_price: number
  // Broken case
  allow_broken_case: boolean
  broken_case_discount: number
  broken_case_piece_price: number
  // VAT
  vat_rate: VatRate | null
  // Stock & Availability
  stock_quantity: number
  availability_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder'
  availability_label?: string
  availability_color?: string
  can_purchase: boolean
  allow_backorder?: boolean
  is_preorder?: boolean
  // Box/Case configuration
  boxes_per_case: number
  // MOQ
  moq_quantity: number
  moq_unit: 'piece' | 'box'
}

// Cart types
export interface CartItem {
  product_id: number
  name: string
  sku: string
  image_url: string | null
  price: number
  base_price: number
  total_discount: number
  total_discount_percent: number
  quantity: number
  unit_type: 'piece' | 'box'
  pieces_per_box: number
  vat_rate: number
  // Broken case support
  allow_broken_case?: boolean
  broken_case_piece_price?: number
  box_price?: number // Original box price for switching back
  // Availability
  availability_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder'
  allow_backorder?: boolean
  is_preorder?: boolean
}

// Order types
export interface OrderItemProduct {
  id: number
  name: string
  sku: string
  image_url: string | null
  pieces_per_box?: number
}

export interface OrderItem {
  id: number
  product_id?: number
  product?: OrderItemProduct
  quantity_ordered: number
  unit_price: number
  original_price: number
  discount?: number
  unit_type: 'piece' | 'box'
  pieces_per_box?: number
  vat_rate: number
  line_total: number
  // Availability (optional, if returned by API)
  availability_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder'
  allow_backorder?: boolean
  is_preorder?: boolean
}

export interface Order {
  id: number
  order_number: string
  customer_id?: number
  customer?: Customer
  created_by?: { id: number; name: string }
  items: OrderItem[]
  items_count?: number
  subtotal: number
  discount_total: number
  vat_total: number
  total: number
  notes: string | null
  status: string
  created_at: string
  afas_synced?: boolean
  afas_order_id?: string | null
}

export interface CreateOrderRequest {
  customer_id: number
  items: {
    product_id: number
    quantity: number
    price: number
    base_price: number
    unit_type: 'piece' | 'box'
    pieces_per_box: number
    vat_rate: number
  }[]
  notes?: string
  applied_promotions?: {
    promotion_id: number
    discount_amount: number
  }[]
}

// Promotion types
export interface Promotion {
  id: number
  name: string
  code: string | null
  type: 'percentage' | 'fixed' | 'buy_x_get_y'
  value: number
  description: string
  minimum_order_value: number | null
  ends_at: string | null
  discount_amount?: number
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface ProductSearchResponse {
  products: Product[]
  total: number
  hasMore: boolean
}

export interface BarcodeSearchResponse {
  success: boolean
  product?: Product
  scanned_unit?: 'piece' | 'box'
  message?: string
}

export interface LoginResponse {
  success: boolean
  token?: string
  user?: User
  permissions?: UserPermissions
  message?: string
}

export interface TenantVerifyResponse {
  success: boolean
  tenant?: Tenant
  message?: string
}
