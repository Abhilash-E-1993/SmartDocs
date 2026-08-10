import { AlignLeft, FileCode, FileText, Globe, MonitorPlay } from 'lucide-react'

const SOURCE_TYPES = [
  { icon: FileText, label: 'PDF documents' },
  { icon: Globe, label: 'Websites' },
  { icon: MonitorPlay, label: 'YouTube videos' },
  { icon: FileCode, label: 'Markdown' },
  { icon: AlignLeft, label: 'Plain text' },
] as const

/** Infinite, edge-masked marquee of the source types SmartDocs ingests. */
export function SourceMarquee() {
  return (
    <section className="border-y bg-muted/30 py-10">
      <p className="px-4 text-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
        Works with the knowledge you already have
      </p>
      <div
        aria-hidden
        className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
      >
        <div className="landing-marquee flex w-max items-center gap-10 pr-10">
          {[...SOURCE_TYPES, ...SOURCE_TYPES, ...SOURCE_TYPES, ...SOURCE_TYPES].map(
            (item, index) => (
              <span
                key={`${item.label}-${index}`}
                className="flex items-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
