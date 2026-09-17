import { API_BASE_URL } from '@/lib/axios'

// Render's free tier spins the API down after ~15 minutes of inactivity and
// takes 15-20s to cold start. We fire a best-effort health ping as early as
// possible (app bootstrap) so the cold start overlaps with the user reading
// the landing page or signing in, then keep pinging while the tab is open so
// the server stays warm for the whole session.

const SUCCESS_THROTTLE_MS = 10 * 60_000
const RETRY_THROTTLE_MS = 30_000
const REQUEST_TIMEOUT_MS = 60_000
const KEEP_WARM_TICK_MS = 60_000

let lastAttemptAt = 0
let lastSuccessAt = 0
let keepWarmTimer: number | undefined

async function ping(): Promise<void> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    lastSuccessAt = Date.now()
  } catch {
    // Best effort only — warming the server must never surface as an error.
  } finally {
    window.clearTimeout(timeout)
  }
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
  if (now - lastAttemptAt < RETRY_THROTTLE_MS) {
    return
  }
  lastAttemptAt = now

  void ping()

  // Keep the server warm while the app stays open. warmUpServer throttles
  // itself, so the actual network ping happens at most once per 10 minutes.
  keepWarmTimer ??= window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      warmUpServer()
    }
  }, KEEP_WARM_TICK_MS)
}
