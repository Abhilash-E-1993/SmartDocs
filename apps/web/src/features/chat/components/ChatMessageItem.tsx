import { Bot, Brain, Check, Copy, ShieldCheck } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'

import { Markdown } from '@/components/markdown/Markdown'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CitationList } from '@/features/citations/components/CitationList'
import type { ChatCitation, ChatMessage } from '@/types/chat'

interface ChatMessageItemProps {
  message: ChatMessage
  onCitationClick: (citation: ChatCitation) => void
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  onCitationClick,
}: ChatMessageItemProps) {
  if (message.role === 'user') {
    return (
      <div className="animate-enter flex justify-end">
        <div className="user-bubble max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    )
  }

  return <AssistantMessage message={message} onCitationClick={onCitationClick} />
})

function AssistantMessage({ message, onCitationClick }: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current)
      }
    }
  }, [])

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const verified = message.verificationScore !== null && message.verificationScore >= 8
  const personalized = message.memories.length > 0

  return (
    <div className="group animate-enter flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
        <Bot className="size-3.5" />
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
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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

        <div className="mt-1 flex items-center gap-1 transition-opacity duration-150 focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label={copied ? 'Answer copied' : 'Copy answer'}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
