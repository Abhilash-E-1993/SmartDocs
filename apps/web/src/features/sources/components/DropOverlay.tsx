import { Upload } from 'lucide-react'

export function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-foreground/40 bg-background/80 backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-150">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg ring-8 ring-foreground/5">
        <Upload className="size-6" />
      </div>
      <p className="text-sm font-medium">Drop PDFs to upload</p>
      <p className="text-xs text-muted-foreground">Up to 10 MB per file</p>
    </div>
  )
}
