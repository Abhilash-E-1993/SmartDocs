import { Bot } from 'lucide-react'

import { Markdown } from '@/components/markdown/Markdown'
import { TypingIndicator } from '@/features/chat/components/TypingIndicator'
import type { ChatStreamStage } from '@/types/chat'

const STAGE_LABELS: Record<ChatStreamStage, string> = {
  rewriting: 'Planning the search…',
  searching: 'Searching your sources…',
  ranking: 'Ranking the best passages…',
  generating: 'Writing the answer…',
  verifying: 'Verifying the answer…',
  retrying: 'Improving the answer…',
}

interface StreamingMessageProps {
  stage: ChatStreamStage | null
  content: string
}

export function StreamingMessage({ stage, content }: StreamingMessageProps) {
  return (
    <div className="animate-enter flex gap-3">
      <div className="stream-avatar mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
        <Bot className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        {content ? (
          <div>
            <Markdown content={content} />
            <span className="streaming-cursor" aria-hidden="true" />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg py-1">
            <TypingIndicator />
            <span
              key={stage ?? 'thinking'}
              className="text-sm text-muted-foreground animate-in fade-in duration-200"
            >
              {stage ? STAGE_LABELS[stage] : 'Thinking…'}
            </span>
          </div>
        )}

        {content && stage && stage !== 'generating' ? (
          <p
            key={stage}
            className="mt-2 text-xs text-muted-foreground animate-in fade-in duration-200"
          >
            {STAGE_LABELS[stage]}
          </p>
        ) : null}
      </div>
    </div>
  )
}
