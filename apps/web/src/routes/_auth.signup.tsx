import { SignUp } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { createFileRoute } from '@tanstack/react-router'

import { useTheme } from '@/hooks/useTheme'

export const Route = createFileRoute('/_auth/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { resolvedTheme } = useTheme()

  return (
    <SignUp
      routing="path"
      path="/signup"
      signInUrl="/login"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: { borderRadius: '0.625rem' },
        elements: { rootBox: 'w-full', card: 'w-full border shadow-none' },
      }}
    />
  )
}
