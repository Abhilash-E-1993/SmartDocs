import { CheckCircle2, FileText, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { PdfUploadItem } from '@/features/sources/hooks/usePdfUploads'
import { cn } from '@/lib/utils'

interface UploadingCardProps {
  item: PdfUploadItem
  onCancel: (localId: string) => void
  onRetry: (localId: string) => void
  onDismiss: (localId: string) => void
}

export function UploadingCard({ item, onCancel, onRetry, onDismiss }: UploadingCardProps) {
  return (
    <Card
      className={cn(
        'animate-enter gap-3 p-4 transition-[border-color,box-shadow] duration-200',
        item.status === 'error' && 'border-destructive/30 bg-destructive/5',
        item.status === 'success' && 'border-foreground/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md bg-muted',
            item.status === 'error' && 'bg-destructive/10',
          )}
        >
          {item.status === 'success' ? (
            <CheckCircle2 className="animate-pop size-4 text-foreground" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
        </div>

        {item.status === 'uploading' ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Cancel upload"
            onClick={() => onCancel(item.localId)}
          >
            <X className="size-4" />
          </Button>
        ) : null}
        {item.status === 'error' ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Dismiss"
            onClick={() => onDismiss(item.localId)}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="line-clamp-2 text-sm leading-snug font-medium">{item.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {item.status === 'uploading' ? `Uploading… ${item.progress}%` : null}
          {item.status === 'success' ? 'Upload complete' : null}
          {item.status === 'error' ? (item.errorMessage ?? 'Upload failed') : null}
        </p>
      </div>

      {item.status === 'uploading' ? <Progress value={item.progress} className="h-1" /> : null}

      {item.status === 'error' ? (
        <Button variant="outline" size="xs" onClick={() => onRetry(item.localId)}>
          <RotateCcw className="size-3" />
          Retry upload
        </Button>
      ) : null}
    </Card>
  )
}
