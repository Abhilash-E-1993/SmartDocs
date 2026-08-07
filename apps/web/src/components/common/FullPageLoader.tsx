import { Logo } from '@/components/layout/Logo'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Logo className="animate-pulse" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  )
}
