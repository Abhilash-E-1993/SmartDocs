import { Upload } from 'lucide-react'

export function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/70 bg-primary/5 backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-150">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
        <Upload className="size-6 text-primary" />
      </div>
      <p className="text-sm font-medium">Drop PDFs to upload</p>
      <p className="text-xs text-muted-foreground">Up to 10 MB per file</p>
    </div>
  )
}
