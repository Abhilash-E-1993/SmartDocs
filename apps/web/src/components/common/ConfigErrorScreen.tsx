import { KeyRound } from 'lucide-react'

import { Logo } from '@/components/layout/Logo'

const steps = [
  'Create a free application at dashboard.clerk.com',
  'Copy apps/web/.env.example to apps/web/.env',
  'Set VITE_CLERK_PUBLISHABLE_KEY to your publishable key',
  'Restart the dev server',
]

export function ConfigErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <Logo />
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <KeyRound className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Connect Clerk to continue</h1>
          <p className="text-sm text-muted-foreground">
            SmartDocs uses Clerk for authentication. Add your publishable key to get started.
          </p>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
