import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type {
  TenantVerifyResponse,
  LoginResponse,
  Customer,
  PaginatedResponse,
  ProductSearchResponse,
  BarcodeSearchResponse,
  Order,
  CreateOrderRequest,
  Promotion,
  Product,
  User,
} from '@/types'

// Create axios instance
const api: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - will be handled by auth store
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

// Central API URL (for tenant verification)
// This is the main B2B Nord platform that handles tenant verification
const CENTRAL_API_URL = import.meta.env.VITE_CENTRAL_API_URL || 'https://b2bnord.com/api/pos'

// Auth API
export const authApi = {
  verifyTenant: async (domain: string): Promise<TenantVerifyResponse> => {
    const response = await axios.post(`${CENTRAL_API_URL}/tenant/verify`, { domain })
    return response.data
  },

  login: async (email: string, password: string, deviceName: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', {
      email,
      password,
      device_name: deviceName,
    })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/auth/logout-all')
  },

  refresh: async (): Promise<LoginResponse> => {
    const response = await api.post('/auth/refresh')
    return response.data
  },

  getUser: async (): Promise<User> => {
    const response = await api.get('/auth/user')
    return response.data.data ?? response.data
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/reset-password', {
      email,
      token,
      password,
      password_confirmation: passwordConfirmation,
    })
    return response.data
  },
}

// Customer API
export const customerApi = {
  list: async (page = 1, search?: string): Promise<PaginatedResponse<Customer>> => {
    const params: Record<string, any> = { page }
    if (search) params.search = search
    const response = await api.get('/customers', { params })
    return response.data
  },

  get: async (id: number): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`)
    // API returns { success: true, customer: {...} }
    return response.data.customer ?? response.data.data ?? response.data
  },
}

// Product API
export const productApi = {
  search: async (query: string, customerId: number): Promise<ProductSearchResponse> => {
    const response = await api.get('/products/search', {
      params: { q: query, customer_id: customerId },
    })
    return response.data
  },

  findByBarcode: async (barcode: string, customerId: number): Promise<BarcodeSearchResponse> => {
    const response = await api.get(`/products/barcode/${barcode}`, {
      params: { customer_id: customerId },
    })
    return response.data
  },

  getBestSellers: async (customerId: number): Promise<ProductSearchResponse> => {
    const response = await api.get('/products/best-sellers', {
      params: { customer_id: customerId },
    })
    return response.data
  },

  getFavorites: async (customerId: number): Promise<ProductSearchResponse> => {
    const response = await api.get('/products/favorites', {
      params: { customer_id: customerId },
    })
    return response.data
  },

  getDiscounted: async (customerId: number): Promise<ProductSearchResponse> => {
    const response = await api.get('/products/discounted', {
      params: { customer_id: customerId },
    })
    return response.data
  },
}

// Promotion API
export const promotionApi = {
  list: async (customerId: number): Promise<{ success: boolean; promotions: Promotion[] }> => {
    const response = await api.get('/promotions', {
      params: { customer_id: customerId },
    })
    return response.data
  },

  getApplicable: async (
    customerId: number,
    items: { product_id: number; quantity: number; price: number }[],
    couponCode?: string
  ): Promise<{
    success: boolean
    promotions: Promotion[]
    discount_total: number
    final_total: number
  }> => {
    const response = await api.post('/promotions/applicable', {
      customer_id: customerId,
      items,
      coupon_code: couponCode,
    })
    return response.data
  },

  validateCoupon: async (
    customerId: number,
    couponCode: string,
    orderTotal: number
  ): Promise<{ success: boolean; valid: boolean; promotion?: Promotion }> => {
    const response = await api.post('/promotions/validate-coupon', {
      customer_id: customerId,
      coupon_code: couponCode,
      order_total: orderTotal,
    })
    return response.data
  },
}

// Order API
export const orderApi = {
  list: async (page = 1, customerId?: number): Promise<PaginatedResponse<Order>> => {
    const params: Record<string, any> = { page }
    if (customerId) params.customer_id = customerId
    const response = await api.get('/orders', { params })
    return response.data
  },

  get: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}`)
    // API returns { success: true, order: {...} }
    return response.data.order ?? response.data.data ?? response.data
  },

  create: async (
    order: CreateOrderRequest
  ): Promise<{ success: boolean; order_id: number; order_number: string; message: string }> => {
    const response = await api.post('/orders', order)
    return response.data
  },

  sendToAfas: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/orders/${id}/send-to-afas`)
    return response.data
  },
}

// Barcode Assignment API
export const barcodeApi = {
  getProducts: async (
    page = 1,
    search?: string
  ): Promise<PaginatedResponse<Product>> => {
    const params: Record<string, any> = { page }
    if (search) params.search = search
    const response = await api.get('/barcode-assignment/products', { params })
    return response.data
  },

  update: async (
    productId: number,
    barcode: string,
    type: 'piece' | 'box'
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/barcode-assignment/${productId}/update`, {
      barcode,
      type,
    })
    return response.data
  },

  clear: async (
    productId: number,
    type: 'piece' | 'box'
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/barcode-assignment/${productId}/clear`, { type })
    return response.data
  },
}

// Export the axios instance for direct access
export default api
