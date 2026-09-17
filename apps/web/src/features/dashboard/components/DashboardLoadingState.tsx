import { useEffect, useState } from 'react'

import { WorkspaceGridSkeleton } from './WorkspaceGridSkeleton'

const WAKE_MESSAGES = [
  'Waking up the SmartDocs server…',
  'Connecting to the database…',
  'Almost there — preparing your workspaces…',
] as const

const NOTICE_DELAY_MS = 4_000
const MESSAGE_ROTATE_MS = 5_000

/**
 * Dashboard loading state: skeleton grid immediately, and — only when the
 * API is slow (Render cold start) — an honest "waking up the server" status
 * card so a 15-20s first load feels intentional instead of broken.
 */
export function DashboardLoadingState() {
  const [showNotice, setShowNotice] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const noticeTimer = window.setTimeout(() => setShowNotice(true), NOTICE_DELAY_MS)
    const rotateTimer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % WAKE_MESSAGES.length)
    }, MESSAGE_ROTATE_MS)

    return () => {
      window.clearTimeout(noticeTimer)
      window.clearInterval(rotateTimer)
    }
  }, [])

  return (
    <div className="space-y-6">
      <WorkspaceGridSkeleton />

      {showNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-enter mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-xl border bg-card px-6 py-5 text-center shadow-sm"
        >
          <span className="processing-bar h-1 w-40 rounded-full bg-primary/10" />
          <p className="text-sm font-medium">{WAKE_MESSAGES[messageIndex]}</p>
          <p className="text-xs text-muted-foreground">
            The hosted server sleeps when idle, so the first load takes a few extra seconds.
            Everything is instant afterwards.
          </p>
        </div>
      ) : null}
    </div>
  )
}
