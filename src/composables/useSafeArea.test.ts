import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mockPlatform = vi.fn()

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => mockPlatform(),
}))

// Import after mock is set up
import { useSafeArea } from './useSafeArea'

describe('useSafeArea', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  function mountWithSafeArea() {
    const Comp = defineComponent({
      setup() {
        useSafeArea()
        return {}
      },
      render() { return h('div') },
    })
    return mount(Comp)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.style.removeProperty('--safe-area-top')
    document.documentElement.style.removeProperty('--safe-area-bottom')
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('sets safe area CSS variables on android', async () => {
    mockPlatform.mockReturnValue('android')

    wrapper = mountWithSafeArea()
    await nextTick()

    const topVal = document.documentElement.style.getPropertyValue('--safe-area-top')
    expect(topVal).toBe('1.5rem')
  })

  it('does nothing on non-android platforms', async () => {
    mockPlatform.mockReturnValue('macos')

    wrapper = mountWithSafeArea()
    await nextTick()

    const topVal = document.documentElement.style.getPropertyValue('--safe-area-top')
    expect(topVal).toBe('')
  })

  it('removes resize listener on unmount', async () => {
    mockPlatform.mockReturnValue('android')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    wrapper = mountWithSafeArea()
    await nextTick()

    wrapper.unmount()
    wrapper = null

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })
})
