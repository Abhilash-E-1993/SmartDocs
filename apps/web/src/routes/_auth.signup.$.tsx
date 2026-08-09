import { createFileRoute } from '@tanstack/react-router'

import { ClerkSignUp } from '@/features/auth/components/ClerkSignUp'

// Splat route: matches Clerk's internal sub-paths such as
// `/signup/sso-callback` (OAuth redirect target) and
// `/signup/verify-email-address`. Without it, the router renders the 404
// page before Clerk can complete the sign-up flow.
export const Route = createFileRoute('/_auth/signup/$')({
  component: ClerkSignUp,
})
