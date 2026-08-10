import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RenameSourceDialog } from '@/features/sources/components/RenameSourceDialog'
import { DeleteSourceDialog } from '@/features/sources/components/DeleteSourceDialog'
import { useRetrySource } from '@/features/sources/hooks/useRetrySource'
import {
  ACTIVE_SOURCE_STATUSES,
  SOURCE_STATUS_META,
  SOURCE_TYPE_META,
} from '@/features/sources/utils/source-meta'
import { cn } from '@/lib/utils'
import type { Source } from '@/types/source'
import { formatDate } from '@/utils/formatDate'

interface SourceListItemProps {
  source: Source
  onOpenDetails: (source: Source) => void
}

export function SourceListItem({ source, onOpenDetails }: SourceListItemProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const typeMeta = SOURCE_TYPE_META[source.sourceType]
  const statusMeta = SOURCE_STATUS_META[source.status]
  const TypeIcon = typeMeta.icon
  const isActive = ACTIVE_SOURCE_STATUSES.includes(source.status)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetails(source)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onOpenDetails(source)
          }
        }}
        className="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <TypeIcon className="size-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{source.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                statusMeta.dotClassName,
                isActive && 'animate-pulse',
              )}
            />
            <span className="truncate">
              {statusMeta.label} · {typeMeta.label} · {formatDate(source.createdAt)}
            </span>
          </span>
        </span>

        {source.status === 'FAILED' ? <FailedRetry source={source} /> : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Source actions"
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 transition-opacity focus-visible:opacity-100 data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onOpenDetails(source)}>View details</DropdownMenuItem>
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

      <RenameSourceDialog source={source} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteSourceDialog source={source} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

function FailedRetry({ source }: { source: Source }) {
  const retryMutation = useRetrySource(source.workspaceId)

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Retry processing"
      disabled={retryMutation.isPending}
      onClick={(event) => {
        event.stopPropagation()
        retryMutation.mutate(source.id)
      }}
      className="shrink-0 text-destructive hover:text-destructive"
    >
      <RotateCcw className="size-3" />
    </Button>
  )
}
