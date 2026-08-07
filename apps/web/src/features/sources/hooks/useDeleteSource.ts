import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { sourcesQueryKey } from '@/features/sources/hooks/useSources'
import { getErrorMessage } from '@/lib/axios'
import { sourceService } from '@/services/source.service'
import type { Source } from '@/types/source'

export function useDeleteSource(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sourceService.remove(id),
    onMutate: async (id) => {
      const queryKey = sourcesQueryKey(workspaceId)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Source[]>(queryKey)

      queryClient.setQueryData<Source[]>(queryKey, (old) =>
        old?.filter((source) => source.id !== id),
      )

      return { previous }
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(sourcesQueryKey(workspaceId), context?.previous)
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Source deleted')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: sourcesQueryKey(workspaceId) })
    },
  })
}
