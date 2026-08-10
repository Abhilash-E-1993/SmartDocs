import { Bot, History } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ChatComposer } from '@/features/chat/components/ChatComposer'

const SUGGESTIONS = [
  'Summarize the key points from my sources',
  'What are the main topics covered?',
  'Explain the most important concept simply',
] as const

interface ChatWelcomeProps {
  starting: boolean
  hasChats: boolean
  onSend: (content: string) => void
  onBrowseChats: () => void
}

export function ChatWelcome({ starting, hasChats, onSend, onBrowseChats }: ChatWelcomeProps) {
  return (
    <div className="animate-enter relative flex h-full flex-col">
      {hasChats ? (
        <div className="flex justify-start px-1 pb-2">
          <Button variant="ghost" size="sm" onClick={onBrowseChats}>
            <History className="size-4" />
            Chat history
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
          <Bot className="size-7" />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Ask anything about your sources
        </h2>
        <p className="mt-3 max-w-lg text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          Start typing below — your chat begins the moment you send. Answers stream in with
          citations you can verify.
        </p>

        <div className="mt-8 w-full max-w-3xl">
          <ChatComposer
            streaming={false}
            disabled={starting}
            autoFocus
            onSend={onSend}
            placeholder={starting ? 'Starting your chat…' : 'Ask about your sources…'}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-1">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              disabled={starting}
              onClick={() => onSend(suggestion)}
              style={{ animationDelay: `${(index + 1) * 60}ms` }}
              className="animate-enter inline-flex items-center rounded-full border bg-card px-4 py-2 text-[13px] font-medium text-muted-foreground shadow-xs transition-[border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-foreground/25 hover:text-foreground hover:shadow-sm active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
