import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCaptureException = vi.fn()
const mockCaptureMessage = vi.fn()

vi.mock('@sentry/vue', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}))

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('warn logs in dev mode', async () => {
    vi.stubEnv('DEV', true)
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { logger } = await import('./logger')
    logger.warn('test warning')

    expect(consoleSpy).toHaveBeenCalledWith('[POS]', 'test warning')
    consoleSpy.mockRestore()
  })

  it('error logs in dev mode', async () => {
    vi.stubEnv('DEV', true)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { logger } = await import('./logger')
    logger.error('test error')

    expect(consoleSpy).toHaveBeenCalledWith('[POS]', 'test error')
    consoleSpy.mockRestore()
  })

  it('info logs in dev mode', async () => {
    vi.stubEnv('DEV', true)
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { logger } = await import('./logger')
    logger.info('test info')

    expect(consoleSpy).toHaveBeenCalledWith('[POS]', 'test info')
    consoleSpy.mockRestore()
  })

  it('error sends Error to Sentry.captureException in prod mode', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { logger } = await import('./logger')
    const err = new Error('production error')
    logger.error('context', err)

    expect(mockCaptureException).toHaveBeenCalledWith(err)
    consoleSpy.mockRestore()
  })

  it('error sends string args to Sentry.captureMessage in prod mode', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { logger } = await import('./logger')
    logger.error('something went wrong', 'detail')

    expect(mockCaptureMessage).toHaveBeenCalledWith('something went wrong detail', 'error')
    consoleSpy.mockRestore()
  })

  it('warn and info do not log in non-dev mode', async () => {
    vi.stubEnv('DEV', false)
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { logger } = await import('./logger')
    logger.warn('should not log')
    logger.info('should not log')

    expect(consoleWarnSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })
})
