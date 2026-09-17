import { useEffect, useState } from 'react'

import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/utils'

const SLOW_HINT_DELAY_MS = 5_000

export function FullPageLoader() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_HINT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <Logo />
      <div
        role="status"
        aria-label="Loading"
        className="processing-bar h-1 w-28 rounded-full bg-primary/10"
      />
      <p
        aria-live="polite"
        className={cn(
          'max-w-xs text-center text-xs text-muted-foreground transition-opacity duration-500',
          slow ? 'opacity-100' : 'opacity-0',
        )}
      >
        Waking up the server — the first load after idle can take a few extra seconds.
      </p>
    </div>
  )
}
