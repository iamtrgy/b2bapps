/**
 * Platform utilities for safe area insets and device detection
 * Uses native Tauri plugins on mobile, CSS env() fallback on desktop
 */

import { platform } from '@tauri-apps/plugin-os'

let currentPlatform: string | null = null
let orientationHandler: (() => void) | null = null

/**
 * Detect the current platform (android, ios, macos, windows, linux)
 */
export async function getPlatform(): Promise<string> {
  if (currentPlatform) return currentPlatform
  try {
    currentPlatform = await platform()
  } catch {
    currentPlatform = 'web'
  }
  return currentPlatform
}

/**
 * Check if running on a mobile platform
 */
export async function isMobile(): Promise<boolean> {
  const p = await getPlatform()
  return p === 'android' || p === 'ios'
}

/**
 * Apply native safe area insets as CSS custom properties
 * On Android/iOS: uses tauri-plugin-safe-area-insets
 * On desktop/web: falls back to env(safe-area-inset-*)
 */
export async function applySafeAreaInsets(): Promise<void> {
  const p = await getPlatform()

  if (p === 'android' || p === 'ios') {
    try {
      // Dynamic import to avoid loading on desktop
      const { getInsets } = await import('tauri-plugin-safe-area-insets')
      const insets = await getInsets()

      const root = document.documentElement
      root.style.setProperty('--safe-area-top', `${insets.top}px`)
      root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`)
      root.style.setProperty('--safe-area-left', `${insets.left}px`)
      root.style.setProperty('--safe-area-right', `${insets.right}px`)

      console.log('Safe area insets (native):', insets)
    } catch (error) {
      console.warn('Failed to get native safe area insets, using fallback:', error)
      applyFallbackInsets()
    }
  } else {
    applyFallbackInsets()
  }
}

/**
 * Set CSS vars to use env() values (works on iOS, macOS)
 */
function applyFallbackInsets() {
  const root = document.documentElement
  root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)')
  root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)')
  root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)')
  root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)')
}

/**
 * Initialize platform utilities
 * - Detects platform
 * - Applies safe area insets
 * - Listens for orientation changes to refresh insets
 */
export async function initPlatform(): Promise<void> {
  await applySafeAreaInsets()

  // Re-apply insets on orientation change (for tablet rotation)
  orientationHandler = () => {
    // Small delay to let the system update inset values
    setTimeout(() => applySafeAreaInsets(), 200)
  }

  // Use screen orientation API if available
  if (screen.orientation) {
    screen.orientation.addEventListener('change', orientationHandler)
  }
  // Fallback to resize event
  window.addEventListener('resize', orientationHandler)
}

/**
 * Cleanup listeners
 */
export function cleanupPlatform(): void {
  if (orientationHandler) {
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', orientationHandler)
    }
    window.removeEventListener('resize', orientationHandler)
    orientationHandler = null
  }
}
