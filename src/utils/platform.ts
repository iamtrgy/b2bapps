/**
 * Platform utilities for safe area insets and device detection
 *
 * On mobile (Android/iOS): tauri-plugin-edge-to-edge automatically injects
 * CSS variables: --safe-area-inset-top, --safe-area-inset-bottom, --safe-area-top, --safe-area-bottom
 * and dispatches 'safeAreaChanged' events.
 *
 * On desktop: falls back to env(safe-area-inset-*) CSS values.
 */

import { platform } from '@tauri-apps/plugin-os'

let currentPlatform: string | null = null

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
 * Apply fallback safe area insets for desktop platforms.
 * On mobile, tauri-plugin-edge-to-edge handles this automatically.
 */
function applyDesktopFallbackInsets() {
  const root = document.documentElement
  root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)')
  root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)')
  root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left, 0px)')
  root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right, 0px)')
  // Also set the aliases used by edge-to-edge plugin
  root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)')
  root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)')
}

/**
 * Initialize platform utilities
 * On desktop: applies CSS env() fallbacks
 * On mobile: edge-to-edge plugin handles everything automatically
 */
export async function initPlatform(): Promise<void> {
  const p = await getPlatform()

  if (p !== 'android' && p !== 'ios') {
    applyDesktopFallbackInsets()
  }
  // On mobile, tauri-plugin-edge-to-edge auto-injects CSS vars
  // and updates them on orientation change / keyboard show/hide
}

/**
 * Cleanup listeners
 */
export function cleanupPlatform(): void {
  // edge-to-edge plugin manages its own listeners
}
