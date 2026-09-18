import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'

import { FullPageLoader } from '@/components/common/FullPageLoader'
import { AppShell } from '@/components/layout/AppShell'
import { useSyncUser } from '@/features/auth/hooks/useSyncUser'
import { WORKSPACES_QUERY_KEY } from '@/features/workspace/hooks/useWorkspaces'
import { workspaceService } from '@/services/workspace.service'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  useSyncUser()

  // Prefetch the workspaces list the instant Clerk confirms sign-in, so the
  // request is already in flight before the dashboard route mounts — shaving
  // the guard + render delay off the first-load critical path.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void queryClient.prefetchQuery({
        queryKey: WORKSPACES_QUERY_KEY,
        queryFn: workspaceService.list,
        staleTime: 2 * 60_000,
      })
    }
  }, [isLoaded, isSignedIn, queryClient])

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
