import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { sourcesQueryKey } from '@/features/sources/hooks/useSources'
import { getErrorMessage } from '@/lib/axios'
import { sourceService } from '@/services/source.service'
import type { Source } from '@/types/source'

export type CreateSourceInput =
  | { kind: 'text' | 'markdown'; workspaceId: string; title: string; content: string }
  | { kind: 'website' | 'youtube'; workspaceId: string; url: string; title?: string }

export function useCreateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSourceInput): Promise<Source> => {
      switch (input.kind) {
        case 'text':
        case 'markdown':
          return sourceService.createText(input.workspaceId, {
            title: input.title,
            content: input.content,
            kind: input.kind,
          })
        case 'website':
          return sourceService.createWebsite(input.workspaceId, {
            url: input.url,
            title: input.title,
          })
        case 'youtube':
          return sourceService.createYoutube(input.workspaceId, {
            url: input.url,
            title: input.title,
          })
      }
    },
    onSuccess: (source) => {
      toast.success(`"${source.title}" added`)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: sourcesQueryKey(input.workspaceId) })
    },
  })
}
