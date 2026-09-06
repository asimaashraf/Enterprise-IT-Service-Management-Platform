import axios, { type AxiosError } from 'axios'

import { authStorage } from '@/lib/authStorage'
import { clearAuth } from '@/store/authSlice'
import { store } from '@/store/store'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let isHandlingUnauthorized = false

apiClient.interceptors.response.use(
  undefined, // passthrough — callers unwrap the envelope
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true
        try {
          authStorage.clear()
          store.dispatch(clearAuth())
        } finally {
          setTimeout(() => {
            isHandlingUnauthorized = false
          }, 0)
        }
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
