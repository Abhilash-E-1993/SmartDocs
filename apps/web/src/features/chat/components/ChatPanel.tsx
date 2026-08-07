import { ArrowLeft, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { CitationPanel } from '@/features/citations/components/CitationPanel'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessageList } from '@/features/chat/components/ChatMessageList'
import { useChatMessages } from '@/features/chat/hooks/useChatMessages'
import type { ChatStreamState } from '@/features/chat/hooks/useChatStream'
import type { ChatCitation } from '@/types/chat'

interface ChatPanelProps {
  chatId: string
  title: string
  streamState: ChatStreamState | null
  onSend: (content: string) => void
  onStop: () => void
  onBack: () => void
  onDismissError: () => void
}

export function ChatPanel({
  chatId,
  title,
  streamState,
  onSend,
  onStop,
  onBack,
  onDismissError,
}: ChatPanelProps) {
  const { data: messages, isLoading, isError, error, refetch } = useChatMessages(chatId)
  const [citation, setCitation] = useState<ChatCitation | null>(null)

  const streaming = Boolean(streamState?.active)

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b px-1 pt-1 pb-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back to chats"
          className="md:hidden"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3>
      </header>

      <ChatMessageList
        chatId={chatId}
        messages={messages}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        streamState={streamState}
        onCitationClick={setCitation}
      />

      {streamState?.error ? (
        <div className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="min-w-0 flex-1">{streamState.error}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="shrink-0 text-destructive hover:text-destructive"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <ChatComposer streaming={streaming} onSend={onSend} onStop={onStop} />

      <CitationPanel citation={citation} onClose={() => setCitation(null)} />
    </div>
  )
}
