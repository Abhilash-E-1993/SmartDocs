import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, Navigate } from '@tanstack/react-router'

import { FullPageLoader } from '@/components/common/FullPageLoader'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <FullPageLoader />
  }

  return <Navigate to={isSignedIn ? '/dashboard' : '/login'} />
}
