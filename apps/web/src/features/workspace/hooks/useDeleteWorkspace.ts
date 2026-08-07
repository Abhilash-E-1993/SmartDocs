import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/axios'
import { workspaceService } from '@/services/workspace.service'
import type { Workspace } from '@/types/workspace'
import { WORKSPACES_QUERY_KEY } from './useWorkspaces'

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => workspaceService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACES_QUERY_KEY })
      const previous = queryClient.getQueryData<Workspace[]>(WORKSPACES_QUERY_KEY)

      queryClient.setQueryData<Workspace[]>(WORKSPACES_QUERY_KEY, (old) =>
        old?.filter((workspace) => workspace.id !== id),
      )

      return { previous }
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(WORKSPACES_QUERY_KEY, context?.previous)
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Workspace deleted')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
    },
  })
}
