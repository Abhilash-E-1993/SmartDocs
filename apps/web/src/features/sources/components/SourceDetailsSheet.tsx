import { ExternalLink, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteSourceDialog } from '@/features/sources/components/DeleteSourceDialog'
import { RenameSourceDialog } from '@/features/sources/components/RenameSourceDialog'
import { SourceStatusBadge } from '@/features/sources/components/SourceStatusBadge'
import { useRetrySource } from '@/features/sources/hooks/useRetrySource'
import { useSource } from '@/features/sources/hooks/useSources'
import { SOURCE_TYPE_META } from '@/features/sources/utils/source-meta'
import type { Source } from '@/types/source'
import { fileSize } from '@/utils/fileSize'
import { formatDate } from '@/utils/formatDate'

interface SourceDetailsSheetProps {
  source: Source | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SourceDetailsSheet({ source, open, onOpenChange }: SourceDetailsSheetProps) {
  const { data: detail, isLoading } = useSource(source?.id, open)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const retryMutation = useRetrySource(source?.workspaceId ?? '')

  if (!source) {
    return null
  }

  const display = detail ?? source
  const typeMeta = SOURCE_TYPE_META[display.sourceType]
  const TypeIcon = typeMeta.icon
  const externalUrl = display.metadata.url ?? detail?.cloudinaryUrl ?? null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <TypeIcon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="truncate">{display.title}</SheetTitle>
                <SheetDescription>{typeMeta.label} source</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            <div className="flex items-center gap-2">
              <SourceStatusBadge status={display.status} />
              {isLoading ? <Skeleton className="h-4 w-24" /> : null}
            </div>

            {display.status === 'FAILED' && display.errorMessage ? (
              <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive">Processing failed</p>
                <p className="text-xs text-muted-foreground">{display.errorMessage}</p>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={retryMutation.isPending}
                  onClick={() => retryMutation.mutate(display.id)}
                >
                  <RotateCcw className="size-3" />
                  Retry processing
                </Button>
              </div>
            ) : null}

            <dl className="space-y-3 text-sm">
              <DetailRow label="Created" value={formatDate(display.createdAt)} />
              {display.processedAt ? (
                <DetailRow label="Ready since" value={formatDate(display.processedAt)} />
              ) : null}
              <DetailRow label="Chunks" value={String(display.chunkCount)} />
              <DetailRow label="Characters" value={display.characterCount.toLocaleString('en')} />
              {display.metadata.pageCount ? (
                <DetailRow label="Pages" value={String(display.metadata.pageCount)} />
              ) : null}
              {display.metadata.fileSizeBytes ? (
                <DetailRow label="File size" value={fileSize(display.metadata.fileSizeBytes)} />
              ) : null}
            </dl>

            {externalUrl ? (
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  {display.sourceType === 'pdf' ? 'Open original PDF' : 'Open link'}
                </a>
              </Button>
            ) : null}

            {detail?.contentPreview ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Content preview</p>
                <div className="max-h-48 overflow-y-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                  {detail.contentPreview}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
                <Pencil className="size-4" />
                Rename
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <RenameSourceDialog source={display} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteSourceDialog
        source={display}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => onOpenChange(false)}
      />
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}
