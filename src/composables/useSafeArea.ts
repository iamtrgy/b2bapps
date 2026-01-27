import { onMounted, onUnmounted } from 'vue'
import { platform } from '@tauri-apps/plugin-os'

export function useSafeArea() {
  const apply = () => {
    const p = platform()
    if (p !== 'android') return

    const top = 24
    const bottom = 48
    const left = 0
    const right = 0

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
