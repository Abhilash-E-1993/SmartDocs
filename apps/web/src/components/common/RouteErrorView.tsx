import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'

import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'

export function RouteErrorView({ error }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div className="space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.history.back()}>
          Go back
        </Button>
        <Button onClick={() => router.invalidate()}>Try again</Button>
      </div>
    </div>
  )
}
