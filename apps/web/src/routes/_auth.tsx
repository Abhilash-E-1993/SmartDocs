import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <FullPageLoader />
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" />
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 [background-image:radial-gradient(ellipse_70%_50%_at_50%_-10%,var(--color-accent),transparent)]">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="animate-enter flex w-full max-w-sm flex-col items-center gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Welcome to SmartDocs</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your AI-powered knowledge workspace
            </p>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
