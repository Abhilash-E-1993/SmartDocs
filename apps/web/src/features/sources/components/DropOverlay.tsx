import { Upload } from 'lucide-react'

export function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Upload className="size-6 text-primary" />
      </div>
      <p className="text-sm font-medium">Drop PDFs to upload</p>
      <p className="text-xs text-muted-foreground">Up to 10 MB per file</p>
    </div>
  )
}
