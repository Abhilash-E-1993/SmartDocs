import { Logo } from '@/components/layout/Logo'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Logo />
      <div
        role="status"
        aria-label="Loading"
        className="processing-bar h-1 w-28 rounded-full bg-primary/10"
      />
    </div>
  )
}
