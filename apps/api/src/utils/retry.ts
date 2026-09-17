import { logger } from '../config/logger'

const DEFAULT_ATTEMPTS = 3
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 8000

const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EPIPE',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
])

/** True for transient failures worth retrying: HTTP 408/409/429/5xx and network errors. */
function isRetryable(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status
  if (typeof status === 'number') {
    return status === 408 || status === 409 || status === 429 || status >= 500
  }

  const code = (error as { code?: unknown })?.code
  if (typeof code === 'string' && RETRYABLE_NETWORK_CODES.has(code)) {
    return true
  }

  // Undici/fetch network failures surface as TypeError ("fetch failed").
  return error instanceof TypeError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs fn with exponential backoff + jitter for transient failures.
 * Permanent errors (4xx other than 408/409/429, validation errors, etc.)
 * are rethrown immediately so real problems still fail fast.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; label?: string },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? DEFAULT_ATTEMPTS)
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= attempts || !isRetryable(error)) {
        throw error
      }

      const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1)) +
        Math.floor(Math.random() * 250)
      logger.warn(
        { err: error, attempt, attempts, label: options?.label },
        'Transient failure, retrying after backoff',
      )
      await sleep(delay)
    }
  }

  throw lastError
}
