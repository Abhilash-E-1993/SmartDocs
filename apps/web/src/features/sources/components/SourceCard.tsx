import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RenameSourceDialog } from '@/features/sources/components/RenameSourceDialog'
import { DeleteSourceDialog } from '@/features/sources/components/DeleteSourceDialog'
import { SourceStatusBadge } from '@/features/sources/components/SourceStatusBadge'
import { useRetrySource } from '@/features/sources/hooks/useRetrySource'
import { ACTIVE_SOURCE_STATUSES, SOURCE_TYPE_META } from '@/features/sources/utils/source-meta'
import type { Source } from '@/types/source'
import { formatDate } from '@/utils/formatDate'

interface SourceCardProps {
  source: Source
  onOpenDetails: (source: Source) => void
  style?: CSSProperties
}

export function SourceCard({ source, onOpenDetails, style }: SourceCardProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const typeMeta = SOURCE_TYPE_META[source.sourceType]
  const TypeIcon = typeMeta.icon
  const isActive = ACTIVE_SOURCE_STATUSES.includes(source.status)

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        style={style}
        onClick={() => onOpenDetails(source)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onOpenDetails(source)
          }
        }}
        className="group animate-enter relative cursor-pointer gap-3 p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <TypeIcon className="size-4 text-muted-foreground" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-10 size-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                aria-label="Source actions"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpenDetails(source)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <p className="line-clamp-2 text-sm leading-snug font-medium">{source.title}</p>
          <p className="text-xs text-muted-foreground">
            {typeMeta.label} · {formatDate(source.createdAt)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <SourceStatusBadge status={source.status} />
          {source.status === 'FAILED' ? (
            <span onClick={(event) => event.stopPropagation()}>
              <FailedRetry source={source} />
            </span>
          ) : null}
        </div>

        {source.status === 'FAILED' && source.errorMessage ? (
          <p className="line-clamp-2 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5 text-xs leading-relaxed text-destructive">
            {source.errorMessage}
          </p>
        ) : null}

        {isActive ? (
          <div
            aria-hidden="true"
            className="processing-bar h-1 w-full rounded-full bg-primary/10"
          />
        ) : null}
      </Card>

      <RenameSourceDialog source={source} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteSourceDialog source={source} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

function FailedRetry({ source }: { source: Source }) {
  const retryMutation = useRetrySource(source.workspaceId)

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={retryMutation.isPending}
      onClick={(event) => {
        event.stopPropagation()
        retryMutation.mutate(source.id)
      }}
    >
      <RotateCcw className="size-3" />
      Retry
    </Button>
  )
}
