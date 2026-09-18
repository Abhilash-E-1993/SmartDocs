import { useEffect, useState } from 'react'

import { Logo } from '@/components/layout/Logo'
import { WorkspaceGridSkeleton } from './WorkspaceGridSkeleton'

const STATUS_MESSAGES = [
  'Preparing your workspace…',
  'Getting everything ready…',
  'Almost there — just a moment…',
] as const

const NOTICE_DELAY_MS = 2_500
const MESSAGE_ROTATE_MS = 4_500

/**
 * Dashboard loading state: a skeleton grid immediately, and — when the API is
 * slow (Render free-tier cold start) — a large, centered status panel with
 * calm, professional copy so a slow first load reads as intentional rather
 * than broken.
 */
export function DashboardLoadingState() {
  const [showNotice, setShowNotice] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const noticeTimer = window.setTimeout(() => setShowNotice(true), NOTICE_DELAY_MS)
    const rotateTimer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % STATUS_MESSAGES.length)
    }, MESSAGE_ROTATE_MS)

    return () => {
      window.clearTimeout(noticeTimer)
      window.clearInterval(rotateTimer)
    }
  }, [])

  return (
    <div className="relative">
      <WorkspaceGridSkeleton />

      {showNotice ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className="animate-enter pointer-events-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border bg-card/95 px-8 py-10 text-center shadow-xl backdrop-blur"
          >
            <Logo />
            <span className="processing-bar h-1.5 w-48 rounded-full bg-primary/10" />
            <div className="space-y-1.5">
              <p className="text-base font-medium tracking-tight">
                {STATUS_MESSAGES[messageIndex]}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This can take a moment on your first visit. Everything is instant afterwards.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
