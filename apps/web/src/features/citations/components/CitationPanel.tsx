import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SOURCE_TYPE_META } from '@/features/sources/utils/source-meta'
import type { ChatCitation } from '@/types/chat'

interface CitationPanelProps {
  citation: ChatCitation | null
  onClose: () => void
}

export function CitationPanel({ citation, onClose }: CitationPanelProps) {
  const meta = citation ? SOURCE_TYPE_META[citation.sourceType] : null

  return (
    <Sheet
      open={citation !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      {citation && meta ? (
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <meta.icon className="size-3" />
                {meta.label}
              </Badge>
              <Badge variant="outline">Chunk {citation.chunkIndex + 1}</Badge>
            </div>
            <SheetTitle className="text-base leading-snug">{citation.sourceTitle}</SheetTitle>
            <SheetDescription>
              Chunk position {citation.chunkIndex + 1} · Relevance{' '}
              {Math.round(citation.score * 100)}%
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Referenced content
            </p>
            <div className="rounded-md border-l-2 border-primary bg-muted/50 p-4">
              <p className="text-sm leading-6 whitespace-pre-wrap">{citation.content}</p>
            </div>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  )
}
