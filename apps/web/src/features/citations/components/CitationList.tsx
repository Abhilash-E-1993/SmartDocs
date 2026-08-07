import { SOURCE_TYPE_META } from '@/features/sources/utils/source-meta'
import type { ChatCitation } from '@/types/chat'

interface CitationListProps {
  citations: ChatCitation[]
  onSelect: (citation: ChatCitation) => void
}

export function CitationList({ citations, onSelect }: CitationListProps) {
  const uniqueBySource = citations.filter(
    (citation, index, all) =>
      all.findIndex((candidate) => candidate.sourceId === citation.sourceId) === index,
  )

  if (uniqueBySource.length === 0) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Sources</span>
      {uniqueBySource.map((citation) => {
        const meta = SOURCE_TYPE_META[citation.sourceType]
        return (
          <button
            key={citation.sourceId}
            type="button"
            onClick={() => onSelect(citation)}
            className="inline-flex max-w-56 items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <meta.icon className="size-3 shrink-0" />
            <span className="truncate">{citation.sourceTitle}</span>
          </button>
        )
      })}
    </div>
  )
}
