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
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <MessageSquare className="size-7 text-muted-foreground" />
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">Chat with your knowledge</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Ask questions about your sources and get streamed answers with citations you can verify.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={creating}
            onClick={() => onSuggest(suggestion)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Sparkles className="size-3" />
            {suggestion}
          </button>
        ))}
      </div>

      <Button onClick={onNewChat} disabled={creating} className="mt-6">
        <Plus className="size-4" />
        {creating ? 'Creating…' : 'Start a new chat'}
      </Button>
    </div>
  )
}
