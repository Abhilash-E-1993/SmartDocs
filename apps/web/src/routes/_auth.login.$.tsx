import { createFileRoute } from '@tanstack/react-router'

import { ClerkSignIn } from '@/features/auth/components/ClerkSignIn'

// Splat route: matches Clerk's internal sub-paths such as
// `/login/sso-callback` (OAuth redirect target) and `/login/factor-one`.
// Without it, the router renders the 404 page before Clerk can complete
// the sign-in flow.
export const Route = createFileRoute('/_auth/login/$')({
  component: ClerkSignIn,
})
