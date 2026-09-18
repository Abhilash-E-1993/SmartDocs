import { API_BASE_URL } from '@/lib/axios'

// Render's free tier spins the API down after ~15 minutes of inactivity and
// can take 15-30s to cold start. An inline script in index.html already fires
// a health ping from the very first byte (before the bundle downloads); this
// module is the in-app safety net that (a) avoids double-pinging right after
// that early ping, (b) retries until the server actually answers so a sleeping
// server keeps getting woken, and (c) keeps the server warm while the tab is
// open. Best-effort only — it never throws or surfaces an error.

declare global {
  interface Window {
    __SMARTDOCS_API_URL__?: string
    __SMARTDOCS_WARMUP_FIRED_AT__?: number
  }
}

const SUCCESS_THROTTLE_MS = 10 * 60_000
const RETRY_THROTTLE_MS = 5_000
const REQUEST_TIMEOUT_MS = 60_000
const KEEP_WARM_TICK_MS = 60_000
// If the inline <head> ping fired within this window, treat the server as
// already waking and skip an immediate duplicate ping.
const EARLY_PING_GRACE_MS = 20_000

let lastAttemptAt = 0
let lastSuccessAt = 0
let keepWarmTimer: number | undefined
let retryTimer: number | undefined

const baseUrl = (): string =>
  (window.__SMARTDOCS_API_URL__ ?? API_BASE_URL).replace(/\/+$/, '')

async function ping(): Promise<boolean> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl()}/health`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    if (response.ok) {
      lastSuccessAt = Date.now()
      return true
    }
    return false
  } catch {
    // Best effort only — warming the server must never surface as an error.
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

function scheduleRetryUntilWarm(): void {
  retryTimer ??= window.setInterval(() => {
    if (lastSuccessAt > 0) {
      if (retryTimer !== undefined) {
        window.clearInterval(retryTimer)
        retryTimer = undefined
      }
      return
    }
    const now = Date.now()
    if (now - lastAttemptAt >= RETRY_THROTTLE_MS) {
      lastAttemptAt = now
      void ping()
    }
  }, RETRY_THROTTLE_MS)
}

/**
 * Fire-and-forget request that wakes the API server before the user reaches
 * a screen that needs real data. Safe to call from anywhere, as often as you
 * like — pings are throttled and never throw.
 */
export function warmUpServer(): void {
  const now = Date.now()
  if (now - lastSuccessAt < SUCCESS_THROTTLE_MS) {
    return
  }

  const earlyFiredAt = window.__SMARTDOCS_WARMUP_FIRED_AT__ ?? 0
  const earlyPingFresh = earlyFiredAt > 0 && now - earlyFiredAt < EARLY_PING_GRACE_MS

  if (!earlyPingFresh && now - lastAttemptAt >= RETRY_THROTTLE_MS) {
    lastAttemptAt = now
    void ping()
  }

  // Until the server answers once, keep nudging it so a cold start is never
  // left to a single ping that may have raced the bundle download.
  if (lastSuccessAt === 0) {
    scheduleRetryUntilWarm()
  }

  // Keep the server warm while the app stays open. warmUpServer throttles
  // itself, so the actual network ping happens at most once per 10 minutes.
  keepWarmTimer ??= window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      warmUpServer()
    }
  }, KEEP_WARM_TICK_MS)
}
