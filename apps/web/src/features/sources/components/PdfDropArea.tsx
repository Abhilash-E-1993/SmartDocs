import { Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

interface PdfDropAreaProps {
  onFiles: (files: File[]) => void
}

export function PdfDropArea({ onFiles }: PdfDropAreaProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_PDF_SIZE_BYTES,
    multiple: true,
    onDrop: (accepted, rejections) => {
      if (rejections.length > 0) {
        toast.error('Only PDF files up to 10 MB are supported')
      }

      if (accepted.length > 0) {
        onFiles(accepted)
      }
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
        'hover:border-foreground/30 hover:bg-muted/50',
        isDragActive && 'border-foreground/50 bg-muted/60',
      )}
    >
      <input {...getInputProps()} />
      <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
        <Upload className="size-5" />
      </div>
      <p className="text-sm font-medium">
        {isDragActive ? 'Drop PDFs here' : 'Drag & drop PDFs here, or click to browse'}
      </p>
      <p className="text-xs text-muted-foreground">PDF up to 10 MB · multiple files supported</p>
    </div>
  )
}
