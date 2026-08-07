import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { AppShell } from '@/components/layout/AppShell'
import { useSyncUser } from '@/features/auth/hooks/useSyncUser'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  useSyncUser()

  if (!isLoaded) {
    return <FullPageLoader />
  }

  if (!isSignedIn) {
    return <Navigate to="/login" />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
