import { describe, it, expect } from 'vitest'
import { useFormatters } from './useFormatters'

describe('useFormatters', () => {
  const { formatPrice, formatDate, formatStatus } = useFormatters()

  describe('formatPrice', () => {
    it('formats positive price in EUR', () => {
      const result = formatPrice(1234.56)
      // Turkish locale EUR format
      expect(result).toContain('1.234,56')
    })

    it('formats zero', () => {
      const result = formatPrice(0)
      expect(result).toContain('0,00')
    })

    it('formats negative price', () => {
      const result = formatPrice(-50)
      expect(result).toContain('50,00')
    })

    it('formats small decimal', () => {
      const result = formatPrice(0.99)
      expect(result).toContain('0,99')
    })

    it('formats large number', () => {
      const result = formatPrice(999999.99)
      expect(result).toContain('999.999,99')
    })
  })

  describe('formatDate', () => {
    it('formats valid date string', () => {
      const result = formatDate('2024-01-15T10:30:00Z')
      expect(result).not.toBe('-')
      expect(result).toContain('2024')
    })

    it('returns dash for null', () => {
      expect(formatDate(null)).toBe('-')
    })

    it('returns dash for undefined', () => {
      expect(formatDate(undefined)).toBe('-')
    })

    it('returns dash for empty string', () => {
      expect(formatDate('')).toBe('-')
    })

    it('returns dash for invalid date', () => {
      expect(formatDate('not-a-date')).toBe('-')
    })
  })

  describe('formatStatus', () => {
    it('returns Turkish label for pending', () => {
      expect(formatStatus('pending')).toBe('Beklemede')
    })

    it('returns Turkish label for processing', () => {
      expect(formatStatus('processing')).toBe('İşleniyor')
    })

    it('returns Turkish label for completed', () => {
      expect(formatStatus('completed')).toBe('Tamamlandı')
    })

    it('returns Turkish label for cancelled', () => {
      expect(formatStatus('cancelled')).toBe('İptal Edildi')
    })

    it('returns raw string for unknown status', () => {
      expect(formatStatus('shipped')).toBe('shipped')
    })

    it('returns Bilinmiyor for null', () => {
      expect(formatStatus(null)).toBe('Bilinmiyor')
    })

    it('returns Bilinmiyor for undefined', () => {
      expect(formatStatus(undefined)).toBe('Bilinmiyor')
    })
  })
})
