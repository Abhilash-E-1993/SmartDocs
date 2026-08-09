import { createFileRoute } from '@tanstack/react-router'

import { ClerkSignIn } from '@/features/auth/components/ClerkSignIn'

export const Route = createFileRoute('/_auth/login')({
  component: ClerkSignIn,
})
