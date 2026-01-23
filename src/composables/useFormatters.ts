/**
 * Composable for formatting utilities
 * Caches Intl formatters for performance
 */

// Cached formatters (created once, reused)
const priceFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// Status labels mapping
const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
}

export function useFormatters() {
  function formatPrice(price: number): string {
    return priceFormatter.format(price)
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return dateFormatter.format(date)
  }

  function formatStatus(status: string | null | undefined): string {
    if (!status) return 'Bilinmiyor'
    return STATUS_LABELS[status] || status
  }

  return {
    formatPrice,
    formatDate,
    formatStatus,
  }
}
