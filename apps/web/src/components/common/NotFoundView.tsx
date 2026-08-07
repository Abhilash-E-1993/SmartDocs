import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'

export function NotFoundView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}
