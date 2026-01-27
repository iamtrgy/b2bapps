import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
  error?: string
}

export function useSafeArea() {
  const insets = ref<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 })
  const isLoaded = ref(false)

  const loadInsets = async () => {
    try {
      const result = await invoke<SafeAreaInsets>('plugin:safe-area|get_safe_area_insets')
      insets.value = result

      document.documentElement.style.setProperty('--safe-area-top', `${result.top}px`)
      document.documentElement.style.setProperty('--safe-area-bottom', `${result.bottom}px`)
      document.documentElement.style.setProperty('--safe-area-left', `${result.left}px`)
      document.documentElement.style.setProperty('--safe-area-right', `${result.right}px`)

      console.log('[SafeArea] Insets:', result)
    } catch (e) {
      // Not on Android or plugin not available — CSS env() fallback handles it
      console.log('[SafeArea] Plugin not available, using CSS env() fallback')
    } finally {
      isLoaded.value = true
    }
  }

  onMounted(loadInsets)

  return { insets, isLoaded, loadInsets }
}
