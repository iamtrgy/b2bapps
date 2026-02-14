import * as Sentry from '@sentry/vue'

const isDev = import.meta.env.DEV

export const logger = {
  warn(...args: unknown[]) {
    if (isDev) console.warn('[POS]', ...args)
  },
  error(...args: unknown[]) {
    if (isDev) console.error('[POS]', ...args)
    if (import.meta.env.PROD) {
      const err = args.find(a => a instanceof Error) as Error | undefined
      if (err) Sentry.captureException(err)
      else Sentry.captureMessage(args.map(String).join(' '), 'error')
    }
  },
  info(...args: unknown[]) {
    if (isDev) console.log('[POS]', ...args)
  },
}
