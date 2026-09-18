import { useEffect, useState } from 'react'

import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

const SLOW_HINT_DELAY_MS = 4_000

export function FullPageLoader() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_HINT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-background px-6">
      <Logo className="scale-110" />
      <div
        role="status"
        aria-label="Loading"
        className="processing-bar h-1.5 w-40 rounded-full bg-primary/10"
      />
      <div
        aria-live="polite"
        className={cn(
          'max-w-sm space-y-1.5 text-center transition-opacity duration-500',
          slow ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p className="text-sm font-medium tracking-tight">Loading your workspace…</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This can take a moment on your first visit. Everything is instant afterwards.
        </p>
      </div>
    </div>
  )
}
