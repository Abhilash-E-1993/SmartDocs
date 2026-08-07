import { SignIn } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { createFileRoute } from '@tanstack/react-router'

import { useTheme } from '@/hooks/useTheme'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const { resolvedTheme } = useTheme()

  return (
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/signup"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: { borderRadius: '0.625rem' },
        elements: { rootBox: 'w-full', card: 'w-full border shadow-none' },
      }}
    />
  )
}
