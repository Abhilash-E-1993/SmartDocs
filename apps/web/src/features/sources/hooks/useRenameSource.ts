import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { sourcesQueryKey } from '@/features/sources/hooks/useSources'
import { getErrorMessage } from '@/lib/axios'
import { sourceService } from '@/services/source.service'
import type { Source } from '@/types/source'

interface RenameSourceInput {
  id: string
  title: string
}

export function useRenameSource(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, title }: RenameSourceInput) => sourceService.rename(id, { title }),
    onMutate: async ({ id, title }) => {
      const queryKey = sourcesQueryKey(workspaceId)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Source[]>(queryKey)

      queryClient.setQueryData<Source[]>(queryKey, (old) =>
        old?.map((source) => (source.id === id ? { ...source, title } : source)),
      )

      return { previous }
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(sourcesQueryKey(workspaceId), context?.previous)
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Source renamed')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: sourcesQueryKey(workspaceId) })
    },
  })
}
