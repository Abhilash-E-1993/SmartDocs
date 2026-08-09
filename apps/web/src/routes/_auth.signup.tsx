import { createFileRoute } from '@tanstack/react-router'

import { ClerkSignUp } from '@/features/auth/components/ClerkSignUp'

export const Route = createFileRoute('/_auth/signup')({
  component: ClerkSignUp,
})
