/**
 * Customer-related constants
 */
import type { Customer } from '@/types'

// Type for customer tier
export type CustomerTier = Customer['customer_tier']

// Tier color classes
export const TIER_COLORS: Record<CustomerTier, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

// Virtual scrolling constants
export const ITEM_HEIGHT = 84 // Total height including gap
export const ITEM_GAP = 8 // Gap between items
export const VIRTUAL_OVERSCAN = 5 // Extra items to render above/below viewport

// Search debounce
export const SEARCH_DEBOUNCE_MS = 300

// Scroll container height offset (header + search + padding)
export const SCROLL_CONTAINER_OFFSET = 200

// UI Text (for future i18n)
export const UI_TEXT = {
  title: 'Müşteriler',
  searchPlaceholder: 'Müşteri ara...',
  refresh: 'Yenile',
  retry: 'Tekrar Dene',
  loadMore: 'Daha Fazla Yükle',
  noCustomers: 'Müşteri bulunamadı',
  loading: 'Yükleniyor',
  errorLoading: 'Müşteriler yüklenirken bir hata oluştu',
  selectForPOS: 'Satış İçin Seç',
  // Detail sheet
  infoTab: 'Bilgi',
  ordersTab: 'Siparişler',
  contact: 'İletişim',
  name: 'Ad',
  email: 'E-posta',
  phone: 'Telefon',
  statistics: 'İstatistikler',
  totalOrders: 'Toplam Sipariş',
  totalSpent: 'Toplam Harcama',
  noOrders: 'Henüz sipariş yok',
  loadMoreOrders: 'Daha Fazla',
  // Order detail
  products: 'Ürünler',
  subtotal: 'Ara Toplam',
  discount: 'İndirim',
  vat: 'KDV',
  total: 'Toplam',
  back: 'Geri',
  unknownStatus: 'Bilinmiyor',
  product: 'Ürün',
  // Order item details
  box: 'koli',
  piece: 'adet',
  vatRate: 'KDV',
}
