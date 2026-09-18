import { AlignLeft, FileCode, FileText, Globe, MonitorPlay, type LucideIcon } from 'lucide-react'

import type { Source, SourceStatus, SourceType } from '@/types/source'

export const SOURCE_TYPE_META: Record<SourceType, { label: string; icon: LucideIcon }> = {
  pdf: { label: 'PDF', icon: FileText },
  text: { label: 'Text', icon: AlignLeft },
  markdown: { label: 'Markdown', icon: FileCode },
  website: { label: 'Website', icon: Globe },
  youtube: { label: 'YouTube', icon: MonitorPlay },
}

export const ACTIVE_SOURCE_STATUSES: readonly SourceStatus[] = [
  'UPLOADING',
  'QUEUED',
  'PROCESSING',
  'INDEXING',
]

// Mirrors the backend watchdog: statuses where work has actually begun and
// should be making progress (QUEUED is excluded — it may just be waiting for
// a concurrency slot). A source in one of these with no update for this long
// is considered stuck and is offered a retry.
const STUCK_STATUSES: readonly SourceStatus[] = ['UPLOADING', 'PROCESSING', 'INDEXING']
const STUCK_AFTER_MS = 15 * 60 * 1000

/** True when a source is in a started-but-active status with no recent update. */
export function isStuckSource(source: Source): boolean {
  if (!STUCK_STATUSES.includes(source.status)) {
    return false
  }
  const reference = source.processingStartedAt ?? source.updatedAt
  return Date.now() - new Date(reference).getTime() > STUCK_AFTER_MS
}

interface StatusMeta {
  label: string
  className: string
  dotClassName: string
}

export const SOURCE_STATUS_META: Record<SourceStatus, StatusMeta> = {
  UPLOADING: {
    label: 'Uploading',
    className: 'border-border bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  QUEUED: {
    label: 'Queued',
    className: 'border-border bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'border-border bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  INDEXING: {
    label: 'Indexing',
    className: 'border-border bg-muted text-muted-foreground',
    dotClassName: 'bg-muted-foreground',
  },
  READY: {
    label: 'Ready',
    className: 'border-foreground/20 bg-foreground/5 text-foreground',
    dotClassName: 'bg-foreground',
  },
  FAILED: {
    label: 'Failed',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
    dotClassName: 'bg-destructive',
  },
}
