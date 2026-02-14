import axios from 'axios'

export function getErrorMessage(error: unknown, fallback = 'Bir hata oluştu'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  return fallback
}

export function isCanceledError(error: unknown): boolean {
  if (axios.isCancel(error)) return true
  if (error instanceof Error && error.name === 'CanceledError') return true
  return false
}
