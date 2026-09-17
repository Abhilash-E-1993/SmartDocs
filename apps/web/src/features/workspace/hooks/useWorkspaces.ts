import { useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceService } from '@/services/workspace.service'
import type { Workspace } from '@/types/workspace'

export const WORKSPACES_QUERY_KEY = ['workspaces'] as const

export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_QUERY_KEY,
    queryFn: workspaceService.list,
    // The list rarely changes; avoid visible refetches when navigating back
    // to the dashboard within a session.
    staleTime: 2 * 60_000,
  })
}

export function useWorkspace(workspaceId: string | undefined) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [...WORKSPACES_QUERY_KEY, workspaceId],
    queryFn: () => {
      if (!workspaceId) {
        throw new Error('workspaceId is required')
      }

      return workspaceService.getById(workspaceId)
    },
    enabled: Boolean(workspaceId),
    initialData: () =>
      queryClient
        .getQueryData<Workspace[]>(WORKSPACES_QUERY_KEY)
        ?.find((w) => w.id === workspaceId),
  })
}
