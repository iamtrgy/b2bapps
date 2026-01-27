/**
 * Platform utilities for safe area insets and device detection
 *
 * On Android: calculates safe area from screen/window dimensions
 * On iOS/desktop: uses CSS env(safe-area-inset-*)
 */

import { platform } from '@tauri-apps/plugin-os'

let currentPlatform: string | null = null
let orientationHandler: (() => void) | null = null

export async function getPlatform(): Promise<string> {
  if (currentPlatform) return currentPlatform
  try {
    currentPlatform = await platform()
  } catch {
    currentPlatform = 'web'
  }
  return currentPlatform
}

export async function isMobile(): Promise<boolean> {
  const p = await getPlatform()
  return p === 'android' || p === 'ios'
}

/**
 * Calculate and apply safe area insets for Android.
 * Android WebView doesn't support env(safe-area-inset-*),
 * so we estimate from screen vs viewport differences.
 */
function applyAndroidInsets() {
  const dpr = window.devicePixelRatio || 1
  // Android status bar is typically 24dp, navigation bar 48dp
  // Convert dp to CSS px (dp values are density-independent)
  const statusBarHeight = Math.round(24 / dpr * dpr) // ~24px
  const navBarHeight = Math.round(48 / dpr * dpr) // ~48px

  // Better detection: compare screen height with available viewport
  const screenH = window.screen.height
  const innerH = window.innerHeight
  const diff = screenH - innerH

  // If there's a significant difference, system UI is present
  const top = diff > 0 ? Math.min(Math.round(diff * 0.3), 48) : statusBarHeight
  const bottom = diff > 0 ? Math.min(Math.round(diff * 0.7), 64) : navBarHeight

  const root = document.documentElement
  root.style.setProperty('--safe-area-top', `${top}px`)
  root.style.setProperty('--safe-area-bottom', `${bottom}px`)
  root.style.setProperty('--safe-area-left', '0px')
  root.style.setProperty('--safe-area-right', '0px')
}

function applyFallbackInsets() {
  const root = document.documentElement
  root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)')
  root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)')
  root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)')
  root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)')
}

export async function initPlatform(): Promise<void> {
  const p = await getPlatform()

  if (p === 'android') {
    applyAndroidInsets()

    // Re-apply on orientation change
    orientationHandler = () => {
      setTimeout(() => applyAndroidInsets(), 300)
    }
    if (screen.orientation) {
      screen.orientation.addEventListener('change', orientationHandler)
    }
    window.addEventListener('resize', orientationHandler)
  } else {
    applyFallbackInsets()
  }
}

export function cleanupPlatform(): void {
  if (orientationHandler) {
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', orientationHandler)
    }
    window.removeEventListener('resize', orientationHandler)
    orientationHandler = null
  }
}
