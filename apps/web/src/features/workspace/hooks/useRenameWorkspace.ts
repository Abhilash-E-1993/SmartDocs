import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/axios'
import { workspaceService } from '@/services/workspace.service'
import type { Workspace } from '@/types/workspace'
import { WORKSPACES_QUERY_KEY } from './useWorkspaces'

interface RenameWorkspaceInput {
  id: string
  name: string
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: RenameWorkspaceInput) => workspaceService.rename(id, { name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: WORKSPACES_QUERY_KEY })
      const previousList = queryClient.getQueryData<Workspace[]>(WORKSPACES_QUERY_KEY)
      const previousDetail = queryClient.getQueryData<Workspace>([...WORKSPACES_QUERY_KEY, id])

      queryClient.setQueryData<Workspace[]>(WORKSPACES_QUERY_KEY, (old) =>
        old?.map((workspace) => (workspace.id === id ? { ...workspace, name } : workspace)),
      )
      queryClient.setQueryData<Workspace>([...WORKSPACES_QUERY_KEY, id], (old) =>
        old ? { ...old, name } : old,
      )

      return { previousList, previousDetail }
    },
    onError: (error, { id }, context) => {
      queryClient.setQueryData(WORKSPACES_QUERY_KEY, context?.previousList)
      queryClient.setQueryData([...WORKSPACES_QUERY_KEY, id], context?.previousDetail)
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Workspace renamed')
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: [...WORKSPACES_QUERY_KEY, id] })
    },
  })
}
