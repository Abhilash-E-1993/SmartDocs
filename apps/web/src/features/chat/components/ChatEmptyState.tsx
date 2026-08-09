import { MessageSquare, Plus, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

const SUGGESTIONS = [
  'Summarize the key points from my sources',
  'What are the main topics covered?',
  'Explain the most important concept simply',
] as const

interface ChatEmptyStateProps {
  creating: boolean
  onNewChat: () => void
  onSuggest: (question: string) => void
}

export function ChatEmptyState({ creating, onNewChat, onSuggest }: ChatEmptyStateProps) {
  return (
    <div className="animate-enter flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border bg-card shadow-xs">
        <MessageSquare className="size-7 text-muted-foreground" />
      </div>
      <h2 className="mt-6 text-lg font-semibold tracking-tight">Chat with your knowledge</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Ask questions about your sources and get streamed answers with citations you can verify.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={suggestion}
            type="button"
            disabled={creating}
            onClick={() => onSuggest(suggestion)}
            style={{ animationDelay: `${(index + 1) * 60}ms` }}
            className="animate-enter inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-xs transition-[border-color,color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-foreground/20 hover:text-foreground hover:shadow-sm active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
          >
            <Sparkles className="size-3" />
            {suggestion}
          </button>
        ))}
      </div>

      <Button onClick={onNewChat} disabled={creating} className="mt-7">
        <Plus className="size-4" />
        {creating ? 'Creating…' : 'Start a new chat'}
      </Button>
    </div>
  )
}
