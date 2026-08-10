import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, Navigate } from '@tanstack/react-router'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { LandingPage } from '@/features/landing/components/LandingPage'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <FullPageLoader />
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" />
  }

  return <LandingPage />
}
