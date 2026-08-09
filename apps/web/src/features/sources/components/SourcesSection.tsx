import { LibraryBig, Plus } from 'lucide-react'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { AddSourceDialog } from '@/features/sources/components/AddSourceDialog'
import { DropOverlay } from '@/features/sources/components/DropOverlay'
import { SourceCard } from '@/features/sources/components/SourceCard'
import { SourceDetailsSheet } from '@/features/sources/components/SourceDetailsSheet'
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
    <section {...getRootProps()} className="relative space-y-4 outline-none">
      <input {...getInputProps()} />
      {isDragActive ? <DropOverlay /> : null}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          Sources
          {sources && sources.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{sources.length}</span>
          ) : null}
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add source
        </Button>
      </div>

      {uploads.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        />
      ) : isEmpty ? (
        <EmptyState
          icon={LibraryBig}
          title="No sources yet"
          description="Add PDFs, text, markdown, websites or YouTube videos — or drop a PDF anywhere on this page."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add your first source
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources?.map((source, index) => (
            <SourceCard
              key={source.id}
              source={source}
              onOpenDetails={setDetailsSource}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            />
          ))}
        </div>
      )}

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
