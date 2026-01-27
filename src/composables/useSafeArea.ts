import { onMounted, onUnmounted } from 'vue'
import { platform } from '@tauri-apps/plugin-os'

export function useSafeArea() {
  const apply = () => {
    const p = platform()
    if (p !== 'android') return

    document.documentElement.style.setProperty('--safe-area-top', '1.5rem')
    document.documentElement.style.setProperty('--safe-area-bottom', '3rem')
    document.documentElement.style.setProperty('--safe-area-left', '0px')
    document.documentElement.style.setProperty('--safe-area-right', '0px')
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
