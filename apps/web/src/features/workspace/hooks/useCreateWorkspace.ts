import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/axios'
import { workspaceService } from '@/services/workspace.service'
import type { Workspace, WorkspaceNameInput } from '@/types/workspace'
import { WORKSPACES_QUERY_KEY } from './useWorkspaces'

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WorkspaceNameInput) => workspaceService.create(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACES_QUERY_KEY })
      const previous = queryClient.getQueryData<Workspace[]>(WORKSPACES_QUERY_KEY)

      const optimisticWorkspace: Workspace = {
        id: `optimistic-${Date.now()}`,
        name: input.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Workspace[]>(WORKSPACES_QUERY_KEY, (old) => [
        optimisticWorkspace,
        ...(old ?? []),
      ])

      return { previous }
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(WORKSPACES_QUERY_KEY, context?.previous)
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Workspace created')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
    },
  })
}
