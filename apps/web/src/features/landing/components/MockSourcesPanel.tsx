import { AlignLeft, FileText, Globe, MonitorPlay } from 'lucide-react'

import { cn } from '@/lib/utils'

const SOURCES = [
  { icon: FileText, name: 'ml-textbook.pdf', ready: true },
  { icon: MonitorPlay, name: 'Lecture 07 — Overfitting', ready: true },
  { icon: Globe, name: 'arxiv.org/abs/2106.09…', ready: true },
  { icon: AlignLeft, name: 'reading-notes.md', ready: false },
] as const

interface MockSourcesPanelProps {
  className?: string
}

/** Decorative sources list for the hero product preview. */
export function MockSourcesPanel({ className }: MockSourcesPanelProps) {
  return (
    <aside aria-hidden className={cn('flex flex-col gap-1 bg-muted/30 p-3', className)}>
      <div className="px-1 pt-1 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Sources
      </div>
      {SOURCES.map((source) => (
        <div key={source.name} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs">
          <source.icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{source.name}</span>
          {source.ready ? (
            <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
          ) : (
            <span className="processing-bar h-1 w-8 shrink-0 rounded-full bg-primary/10" />
          )}
        </div>
      ))}
      <div className="mt-auto px-2 pt-3 pb-1 text-[10px] text-muted-foreground">
        3 ready · 1 processing
      </div>
    </aside>
  )
}
