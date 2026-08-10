import { Plus, Upload } from 'lucide-react'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { AddSourceDialog } from '@/features/sources/components/AddSourceDialog'
import { DropOverlay } from '@/features/sources/components/DropOverlay'
import { SourceDetailsSheet } from '@/features/sources/components/SourceDetailsSheet'
import { SourceListItem } from '@/features/sources/components/SourceListItem'
import { SourcesSkeleton } from '@/features/sources/components/SourcesSkeleton'
import { UploadingCard } from '@/features/sources/components/UploadingCard'
import { usePdfUploads } from '@/features/sources/hooks/usePdfUploads'
import { useSources } from '@/features/sources/hooks/useSources'
import { getErrorMessage } from '@/lib/axios'
import type { Source } from '@/types/source'

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

interface SourcesSectionProps {
  workspaceId: string
}

export function SourcesSection({ workspaceId }: SourcesSectionProps) {
  const { data: sources, isLoading, isError, error, refetch } = useSources(workspaceId)
  const uploads = usePdfUploads(workspaceId)
  const [addOpen, setAddOpen] = useState(false)
  const [detailsSource, setDetailsSource] = useState<Source | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_PDF_SIZE_BYTES,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted, rejections) => {
      if (rejections.length > 0) {
        toast.error('Only PDF files up to 10 MB are supported')
      }

      if (accepted.length > 0) {
        uploads.start(accepted)
      }
    },
  })

  const isEmpty = !isLoading && !isError && sources?.length === 0 && uploads.items.length === 0

  return (
    <section {...getRootProps()} className="relative flex h-full min-h-0 flex-col outline-none">
      <input {...getInputProps()} />
      {isDragActive ? <DropOverlay /> : null}

      <div className="flex h-12 items-center justify-between gap-2 border-b px-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          Sources
          {sources && sources.length > 0 ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
              {sources.length}
            </span>
          ) : null}
        </h2>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => setAddOpen(true)}
          aria-label="Add source"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {uploads.items.length > 0 ? (
          <div className="mb-2 space-y-2">
            {uploads.items.map((item) => (
              <UploadingCard
                key={item.localId}
                item={item}
                onCancel={uploads.cancel}
                onRetry={uploads.retry}
                onDismiss={uploads.dismiss}
              />
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <SourcesSkeleton />
        ) : isError ? (
          <ErrorState
            title="Could not load sources"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
            className="border-0 bg-transparent px-2 py-10"
          />
        ) : isEmpty ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="animate-enter group flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center transition-colors duration-150 hover:border-foreground/30 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Upload className="size-5" />
            </span>
            <span className="mt-4 text-sm font-semibold tracking-tight">No sources yet</span>
            <span className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
              Drop PDFs here, or click to add text, links or videos
            </span>
          </button>
        ) : (
          <div className="space-y-0.5">
            {sources?.map((source) => (
              <SourceListItem key={source.id} source={source} onOpenDetails={setDetailsSource} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Upload className="size-3" />
          Drop PDFs on this panel · up to 10 MB
        </p>
      </div>

      <AddSourceDialog
        workspaceId={workspaceId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onPdfFiles={uploads.start}
      />
      <SourceDetailsSheet
        source={detailsSource}
        open={detailsSource !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsSource(null)
          }
        }}
      />
    </section>
  )
}
