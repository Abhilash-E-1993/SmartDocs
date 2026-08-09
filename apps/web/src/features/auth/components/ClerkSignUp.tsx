import { SignUp } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

import { useTheme } from '@/hooks/useTheme'

/**
 * Clerk sign-up form using path-based routing. Mounted by both the `/signup`
 * route and the `/signup/$` splat route so Clerk can handle its own sub-paths
 * (`/signup/sso-callback`, `/signup/verify-email-address`, etc.) without
 * hitting the router's 404 page.
 */
export function ClerkSignUp() {
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
        elements: { rootBox: 'w-full', card: 'w-full border shadow-md' },
      }}
    />
  )
}
