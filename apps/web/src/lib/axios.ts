import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import type { ApiFailure } from '@/types/api'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

type TokenGetter = () => Promise<string | null>

let tokenGetter: TokenGetter | null = null

export function setAuthTokenGetter(getter: TokenGetter): void {
  tokenGetter = getter
}

export async function getAuthToken(): Promise<string | null> {
  return tokenGetter ? tokenGetter() : null
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong'
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = tokenGetter ? await tokenGetter() : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure>) => {
    if (error.response) {
      const body = error.response.data
      const message = body?.error?.message ?? 'Something went wrong'
      const code = body?.error?.code ?? 'UNKNOWN_ERROR'
      return Promise.reject(
        new ApiRequestError(error.response.status, code, message, body?.error?.details),
      )
    }

    return Promise.reject(new ApiRequestError(0, 'NETWORK_ERROR', 'Unable to reach the server'))
  },
)
