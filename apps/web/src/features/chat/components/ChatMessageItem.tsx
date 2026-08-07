import { Brain, ShieldCheck, Sparkles } from 'lucide-react'

import { Markdown } from '@/components/markdown/Markdown'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CitationList } from '@/features/citations/components/CitationList'
import type { ChatCitation, ChatMessage } from '@/types/chat'

interface ChatMessageItemProps {
  message: ChatMessage
  onCitationClick: (citation: ChatCitation) => void
}

export function ChatMessageItem({ message, onCitationClick }: ChatMessageItemProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-primary-foreground sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    )
  }

  const verified = message.verificationScore !== null && message.verificationScore >= 8
  const personalized = message.memories.length > 0

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Sparkles className="size-3.5 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <Markdown
          content={message.content}
          citations={message.citations}
          onCitationClick={onCitationClick}
        />

        {message.citations.length > 0 ? (
          <CitationList citations={message.citations} onSelect={onCitationClick} />
        ) : null}

        {verified || personalized ? (
          <TooltipProvider delayDuration={200}>
            <div className="mt-2 flex items-center gap-2">
              {verified ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-3" />
                      Verified
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Answer verified against your sources ({message.verificationScore}/10)
                  </TooltipContent>
                </Tooltip>
              ) : null}

              {personalized ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Brain className="size-3" />
                      Memory
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Personalized using your long-term memory</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  )
}
