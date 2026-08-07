import { AlignLeft, FileCode, FileText, Globe, MonitorPlay, type LucideIcon } from 'lucide-react'

import type { SourceStatus, SourceType } from '@/types/source'

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
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dotClassName: 'bg-amber-500',
  },
  INDEXING: {
    label: 'Indexing',
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dotClassName: 'bg-amber-500',
  },
  READY: {
    label: 'Ready',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dotClassName: 'bg-emerald-500',
  },
  FAILED: {
    label: 'Failed',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
    dotClassName: 'bg-destructive',
  },
}
