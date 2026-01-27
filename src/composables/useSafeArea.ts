import { ref, onMounted, onUnmounted } from 'vue'
import { platform } from '@tauri-apps/plugin-os'

interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export function useSafeArea() {
  const insets = ref<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 })
  let resizeHandler: (() => void) | null = null

  const detectInsets = () => {
    const p = platform()
    if (p !== 'android') return // iOS/macOS use CSS env() which works fine

    const vv = window.visualViewport
    const screenW = screen.width
    const screenH = screen.height
    const viewW = vv ? vv.width : window.innerWidth
    const viewH = vv ? vv.height : window.innerHeight
    // Total system UI space = screen size - viewport size
    const isLandscape = viewW > viewH
    const totalVerticalUI = screenH - viewH
    const totalHorizontalUI = screenW - viewW

    let top = 0, bottom = 0, left = 0, right = 0

    if (isLandscape) {
      left = Math.round(totalHorizontalUI / 2)
      right = Math.round(totalHorizontalUI / 2)
      top = Math.min(totalVerticalUI, 24)
      bottom = Math.max(0, totalVerticalUI - top)
    } else {
      top = Math.min(totalVerticalUI, 48)
      bottom = Math.max(0, totalVerticalUI - top)
      if (bottom < 8) {
        top = Math.round(totalVerticalUI * 0.6)
        bottom = totalVerticalUI - top
      }
    }

    insets.value = { top, bottom, left, right }

    document.documentElement.style.setProperty('--safe-area-top', `${top}px`)
    document.documentElement.style.setProperty('--safe-area-bottom', `${bottom}px`)
    document.documentElement.style.setProperty('--safe-area-left', `${left}px`)
    document.documentElement.style.setProperty('--safe-area-right', `${right}px`)

    console.log('[SafeArea] Detected:', { top, bottom, left, right, screenW, screenH, viewW, viewH, isLandscape })
  }

  onMounted(() => {
    detectInsets()
    resizeHandler = () => {
      // Debounce slightly for orientation change
      setTimeout(detectInsets, 100)
    }
    window.addEventListener('resize', resizeHandler)
    window.visualViewport?.addEventListener('resize', resizeHandler)
  })

  onUnmounted(() => {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      window.visualViewport?.removeEventListener('resize', resizeHandler)
    }
  })

  return { insets, detectInsets }
}
