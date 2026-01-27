/**
 * Platform utilities for safe area insets and device detection
 *
 * On Android: native Kotlin code in MainActivity injects actual WindowInsets
 * as CSS variables (--safe-area-top, etc.) directly into the WebView.
 * As fallback, also calls a Rust command for default values.
 *
 * On iOS/desktop: uses CSS env(safe-area-inset-*) which works natively.
 */

import { platform } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'

let currentPlatform: string | null = null

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
 * Initialize platform utilities.
 * On Android: Kotlin code in MainActivity auto-injects CSS variables from real WindowInsets.
 * This function sets fallback values in case the Kotlin injection hasn't run yet.
 * On other platforms: uses CSS env() fallback.
 */
export async function initPlatform(): Promise<void> {
  const p = await getPlatform()

  if (p === 'android') {
    // Kotlin MainActivity injects real values, but set Rust command fallback too
    try {
      const insets = await invoke<{ top: number; bottom: number; left: number; right: number }>('get_safe_area_insets')
      const root = document.documentElement
      // Only set if Kotlin hasn't already injected (check if already set)
      if (!root.style.getPropertyValue('--safe-area-top')) {
        root.style.setProperty('--safe-area-top', `${insets.top}px`)
        root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`)
        root.style.setProperty('--safe-area-left', `${insets.left}px`)
        root.style.setProperty('--safe-area-right', `${insets.right}px`)
      }
    } catch (e) {
      console.warn('[Platform] Failed to get safe area insets from Rust command:', e)
    }
  }
  // On iOS/desktop, CSS env(safe-area-inset-*) handles it via main.css fallbacks
}

export function cleanupPlatform(): void {
  // Nothing to clean up — Kotlin handles its own listeners
}
