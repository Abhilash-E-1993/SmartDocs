import { SignIn } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

import { useTheme } from '@/hooks/useTheme'

/**
 * Clerk sign-in form using path-based routing. Mounted by both the `/login`
 * route and the `/login/$` splat route so Clerk can handle its own sub-paths
 * (`/login/sso-callback`, `/login/factor-one`, etc.) without hitting the
 * router's 404 page.
 */
export function ClerkSignIn() {
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
        elements: { rootBox: 'w-full', card: 'w-full border shadow-md' },
      }}
    />
  )
}
