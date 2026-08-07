import { useQuery } from '@tanstack/react-query'

import { ACTIVE_SOURCE_STATUSES } from '@/features/sources/utils/source-meta'
import { sourceService } from '@/services/source.service'

export function sourcesQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'sources'] as const
}

export function useSources(workspaceId: string) {
  return useQuery({
    queryKey: sourcesQueryKey(workspaceId),
    queryFn: () => sourceService.list(workspaceId),
    refetchInterval: (query) => {
      const sources = query.state.data
      return sources?.some((source) => ACTIVE_SOURCE_STATUSES.includes(source.status))
        ? 2000
        : false
    },
  })
}

export function useSource(sourceId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['sources', sourceId],
    queryFn: () => {
      if (!sourceId) {
        throw new Error('sourceId is required')
      }

      return sourceService.getById(sourceId)
    },
    enabled: enabled && Boolean(sourceId),
  })
}
