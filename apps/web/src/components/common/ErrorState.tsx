import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {message ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p> : null}
      {onRetry || action ? (
        <div className="mt-6 flex items-center gap-2">
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  )
}
