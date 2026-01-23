/**
 * Composable for customer data caching
 * Provides TTL-based caching for customer details and initials memoization
 */
import type { Customer } from '@/types'

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Cache storage
const customerCache = new Map<number, { data: Customer; timestamp: number }>()
const initialsCache = new Map<string, string>()

export function useCustomerCache() {
  /**
   * Get cached customer if not expired
   */
  function getCachedCustomer(id: number): Customer | null {
    const cached = customerCache.get(id)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }
    customerCache.delete(id)
    return null
  }

  /**
   * Store customer in cache
   */
  function setCachedCustomer(id: number, data: Customer): void {
    customerCache.set(id, { data, timestamp: Date.now() })
  }

  /**
   * Get initials from name (memoized)
   */
  function getInitials(name: string): string {
    if (!name) return ''

    const cached = initialsCache.get(name)
    if (cached) return cached

    const initials = name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    initialsCache.set(name, initials)
    return initials
  }

  /**
   * Clear all caches
   */
  function clearCache(): void {
    customerCache.clear()
    initialsCache.clear()
  }

  return {
    getCachedCustomer,
    setCachedCustomer,
    getInitials,
    clearCache,
  }
}
