import { onMounted, onUnmounted } from 'vue'
import { platform } from '@tauri-apps/plugin-os'

export function useSafeArea() {
  const apply = () => {
    const p = platform()
    if (p !== 'android') return

    const isLandscape = window.innerWidth > window.innerHeight

    // Android system bars: status bar ~24dp top, nav bar ~48dp bottom
    // In landscape, bars move to sides
    const top = isLandscape ? 0 : 24
    const bottom = isLandscape ? 0 : 48
    const left = isLandscape ? 48 : 0
    const right = isLandscape ? 48 : 0

    document.documentElement.style.setProperty('--safe-area-top', `${top}px`)
    document.documentElement.style.setProperty('--safe-area-bottom', `${bottom}px`)
    document.documentElement.style.setProperty('--safe-area-left', `${left}px`)
    document.documentElement.style.setProperty('--safe-area-right', `${right}px`)
  }

  let handler: (() => void) | null = null

  onMounted(() => {
    apply()
    handler = () => setTimeout(apply, 150)
    window.addEventListener('resize', handler)
  })

  onUnmounted(() => {
    if (handler) window.removeEventListener('resize', handler)
  })
}
