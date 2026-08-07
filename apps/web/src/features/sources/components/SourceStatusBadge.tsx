import { Badge } from '@/components/ui/badge'
import { ACTIVE_SOURCE_STATUSES, SOURCE_STATUS_META } from '@/features/sources/utils/source-meta'
import { cn } from '@/lib/utils'
import type { SourceStatus } from '@/types/source'

interface SourceStatusBadgeProps {
  status: SourceStatus
}

export function SourceStatusBadge({ status }: SourceStatusBadgeProps) {
  const meta = SOURCE_STATUS_META[status]
  const isActive = ACTIVE_SOURCE_STATUSES.includes(status)

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', meta.className)}>
      <span
        className={cn('size-1.5 rounded-full', meta.dotClassName, isActive && 'animate-pulse')}
      />
      {meta.label}
    </Badge>
  )
}
