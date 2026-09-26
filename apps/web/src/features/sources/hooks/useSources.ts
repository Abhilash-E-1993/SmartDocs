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
    // Keep the details sheet live while the source is still processing so the
    // progress bar animates.
    refetchInterval: (query) => {
      const source = query.state.data
      if (!source) {
        return false
      }
      if (ACTIVE_SOURCE_STATUSES.includes(source.status)) {
        return 2000
      }
      // The PDF file upload to storage runs in the background and can finish
      // after the source is already READY — keep polling until the view link
      // (cloudinaryUrl) lands so the "View PDF" action appears without
      // reopening the sheet.
      if (source.sourceType === 'pdf' && !source.cloudinaryUrl) {
        return 2000
      }
      return false
    },
  })
}
