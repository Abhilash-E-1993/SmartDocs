import { useEffect, useLayoutEffect, useRef } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatMessageItem } from '@/features/chat/components/ChatMessageItem'
import { StreamingMessage } from '@/features/chat/components/StreamingMessage'
import type { ChatStreamState } from '@/features/chat/hooks/useChatStream'
import { getErrorMessage } from '@/lib/axios'
import type { ChatCitation, ChatMessage } from '@/types/chat'

const scrollPositions = new Map<string, number>()
const PIN_THRESHOLD_PX = 80

interface ChatMessageListProps {
  chatId: string
  messages: ChatMessage[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  streamState: ChatStreamState | null
  onCitationClick: (citation: ChatCitation) => void
}

export function ChatMessageList({
  chatId,
  messages,
  isLoading,
  isError,
  error,
  onRetry,
  streamState,
  onCitationClick,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pinnedRef = useRef(true)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || isLoading) {
      return
    }

    const saved = scrollPositions.get(chatId)
    if (saved === undefined) {
      container.scrollTop = container.scrollHeight
      pinnedRef.current = true
    } else {
      container.scrollTop = saved
      pinnedRef.current =
        container.scrollHeight - saved - container.clientHeight < PIN_THRESHOLD_PX
    }
  }, [chatId, isLoading])

  const streamingContent = streamState?.content ?? ''
  const streamingStage = streamState?.stage ?? null
  const messageCount = messages?.length ?? 0

  useEffect(() => {
    const container = containerRef.current
    if (container && pinnedRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [chatId, messageCount, streamingContent, streamingStage])

  const handleScroll = (): void => {
    const container = containerRef.current
    if (!container) {
      return
    }

    scrollPositions.set(chatId, container.scrollTop)
    pinnedRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < PIN_THRESHOLD_PX
  }

  const streamingHere = streamState !== null && streamState.chatId === chatId
  const showEmpty = !isLoading && !isError && messageCount === 0 && !streamingHere

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto px-1 py-4"
    >
      {isLoading ? (
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="flex justify-end">
            <Skeleton className="h-10 w-2/5 rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-1/3 rounded-2xl" />
          </div>
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load messages"
          message={getErrorMessage(error)}
          onRetry={onRetry}
        />
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages?.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              onCitationClick={onCitationClick}
            />
          ))}

          {streamingHere && streamState.question ? (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-primary-foreground sm:max-w-[75%]">
                {streamState.question}
              </div>
            </div>
          ) : null}

          {streamingHere && streamState.active ? (
            <StreamingMessage stage={streamState.stage} content={streamState.content} />
          ) : null}

          {showEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ask a question about your sources to get an answer with citations.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
