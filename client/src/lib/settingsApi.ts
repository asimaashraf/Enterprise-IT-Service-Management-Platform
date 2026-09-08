import { isAxiosError } from 'axios'
import type { ApiEnvelope } from '@/types/auth'

export function unwrapSettings<T>(response: { data: ApiEnvelope<T> }): T {
  if (!response.data.success || response.data.data === undefined) {
    throw new Error(response.data.message || 'Request failed')
  }
  return response.data.data
}

export function settingsError(error: unknown): string {
  if (isAxiosError<ApiEnvelope<unknown>>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      'Request failed. Please try again.'
    )
  }
  return error instanceof Error
    ? error.message
    : 'Request failed. Please try again.'
}
