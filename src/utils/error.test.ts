import { describe, it, expect } from 'vitest'
import axios, { AxiosError, AxiosHeaders } from 'axios'
import { getErrorMessage, isCanceledError } from './error'

describe('getErrorMessage', () => {
  it('returns response.data.message from AxiosError', () => {
    const error = new AxiosError('Request failed', '400', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message: 'Invalid credentials' },
    })
    expect(getErrorMessage(error)).toBe('Invalid credentials')
  })

  it('extracts message from axios error response.data.message', () => {
    const error = new AxiosError('Request failed', '422', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message: 'Validation failed' },
    })
    expect(getErrorMessage(error)).toBe('Validation failed')
  })

  it('falls back to error.message when response has no message', () => {
    const error = new AxiosError('Network Error')
    expect(getErrorMessage(error)).toBe('Network Error')
  })

  it('falls back to error.message when response.data exists but message is undefined', () => {
    const error = new AxiosError('Server Error', '500', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { errors: ['something went wrong'] },
    })
    expect(getErrorMessage(error)).toBe('Server Error')
  })

  it('falls back to error.message when response.data is null', () => {
    const error = new AxiosError('Bad Gateway', '502', undefined, undefined, {
      status: 502,
      statusText: 'Bad Gateway',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: null,
    })
    expect(getErrorMessage(error)).toBe('Bad Gateway')
  })

  it('returns message from a generic Error', () => {
    expect(getErrorMessage(new Error('Something broke'))).toBe('Something broke')
  })

  it('returns fallback for non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('Bir hata oluştu')
    expect(getErrorMessage(42)).toBe('Bir hata oluştu')
    expect(getErrorMessage(null)).toBe('Bir hata oluştu')
    expect(getErrorMessage(undefined)).toBe('Bir hata oluştu')
  })

  it('returns custom fallback when provided', () => {
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
  })

  it('returns fallback when Error.message is empty', () => {
    expect(getErrorMessage(new Error(''))).toBe('Bir hata oluştu')
  })
})

describe('isCanceledError', () => {
  it('returns true for axios.CancelToken cancellation', () => {
    const error = new axios.Cancel('Operation canceled')
    expect(isCanceledError(error)).toBe(true)
  })

  it('returns true for AbortController-style CanceledError', () => {
    const error = new Error('canceled')
    error.name = 'CanceledError'
    expect(isCanceledError(error)).toBe(true)
  })

  it('returns false for regular errors', () => {
    expect(isCanceledError(new Error('Network Error'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isCanceledError('canceled')).toBe(false)
    expect(isCanceledError(null)).toBe(false)
  })
})
