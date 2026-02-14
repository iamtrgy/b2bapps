import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useCustomerCache } from './useCustomerCache'
import type { Customer } from '@/types'

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    company_name: 'Test Co',
    contact_name: 'John Doe',
    contact_email: 'john@test.com',
    contact_phone: '555-1234',
    customer_tier: 'gold',
    ...overrides,
  }
}

describe('useCustomerCache', () => {
  let cache: ReturnType<typeof useCustomerCache>

  beforeEach(() => {
    cache = useCustomerCache()
    cache.clearCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getInitials', () => {
    it('returns initials from multi-word name', () => {
      expect(cache.getInitials('John Doe')).toBe('JD')
    })

    it('returns single initial from single word', () => {
      expect(cache.getInitials('Alice')).toBe('A')
    })

    it('limits to 2 characters', () => {
      expect(cache.getInitials('John Michael Doe')).toBe('JM')
    })

    it('returns empty string for empty input', () => {
      expect(cache.getInitials('')).toBe('')
    })

    it('handles extra spaces', () => {
      expect(cache.getInitials('  John   Doe  ')).toBe('JD')
    })

    it('returns memoized value on second call', () => {
      const first = cache.getInitials('Test Name')
      const second = cache.getInitials('Test Name')
      expect(first).toBe(second)
      expect(first).toBe('TN')
    })
  })

  describe('getCachedCustomer / setCachedCustomer', () => {
    it('returns null for uncached customer', () => {
      expect(cache.getCachedCustomer(999)).toBeNull()
    })

    it('returns cached customer within TTL', () => {
      const customer = makeCustomer({ id: 5 })
      cache.setCachedCustomer(5, customer)
      expect(cache.getCachedCustomer(5)).toEqual(customer)
    })

    it('returns null for expired cache entry', () => {
      const customer = makeCustomer({ id: 10 })
      cache.setCachedCustomer(10, customer)

      // Advance past 5-minute TTL
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      expect(cache.getCachedCustomer(10)).toBeNull()
    })

    it('returns customer just before TTL expires', () => {
      const customer = makeCustomer({ id: 20 })
      cache.setCachedCustomer(20, customer)

      // Advance to just before expiry
      vi.advanceTimersByTime(5 * 60 * 1000 - 1)

      expect(cache.getCachedCustomer(20)).toEqual(customer)
    })
  })

  describe('clearCache', () => {
    it('clears all cached customers', () => {
      cache.setCachedCustomer(1, makeCustomer({ id: 1 }))
      cache.setCachedCustomer(2, makeCustomer({ id: 2 }))
      cache.clearCache()
      expect(cache.getCachedCustomer(1)).toBeNull()
      expect(cache.getCachedCustomer(2)).toBeNull()
    })

    it('clears initials cache', () => {
      cache.getInitials('Test Name')
      cache.clearCache()
      // Initials should still work after clear (re-computes)
      expect(cache.getInitials('Test Name')).toBe('TN')
    })
  })
})
