export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

export interface ApiFailure {
  success: false
  error: ApiErrorBody
}
