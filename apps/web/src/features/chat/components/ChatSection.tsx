import { useEffect } from 'react'

import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState'
import { ChatList } from '@/features/chat/components/ChatList'
import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { useChats } from '@/features/chat/hooks/useChats'
import { useChatStream } from '@/features/chat/hooks/useChatStream'
import { useCreateChat } from '@/features/chat/hooks/useCreateChat'
import { cn } from '@/lib/utils'

interface ChatSectionProps {
  workspaceId: string
  activeChatId: string | undefined
  onSelectChat: (chatId: string | undefined) => void
}

export function ChatSection({ workspaceId, activeChatId, onSelectChat }: ChatSectionProps) {
  const { data: chats, isLoading, isError, error, refetch } = useChats(workspaceId)
  const createChat = useCreateChat(workspaceId)
  const stream = useChatStream(workspaceId)

  const activeChat = chats?.find((chat) => chat.id === activeChatId)
  const streamForActiveChat =
    activeChatId && stream.state.chatId === activeChatId ? stream.state : null

  useEffect(() => {
    if (activeChatId && chats && !chats.some((chat) => chat.id === activeChatId)) {
      onSelectChat(undefined)
    }
  }, [activeChatId, chats, onSelectChat])

  const handleNewChat = async (): Promise<void> => {
    try {
      const chat = await createChat.mutateAsync({})
      onSelectChat(chat.id)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  const handleSend = (content: string): void => {
    if (activeChatId) {
      void stream.send(activeChatId, content)
    }
  }

  const handleSuggest = async (question: string): Promise<void> => {
    try {
      const chat = await createChat.mutateAsync({})
      onSelectChat(chat.id)
      await stream.send(chat.id, question)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[480px] gap-6">
      <div
        className={cn(
          'min-h-0 w-full flex-col md:flex md:w-72 md:shrink-0 lg:w-80',
          activeChatId ? 'hidden md:flex' : 'flex',
        )}
      >
        <ChatList
          workspaceId={workspaceId}
          chats={chats}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onNewChat={() => void handleNewChat()}
          creating={createChat.isPending}
        />
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 flex-col md:flex',
          activeChatId ? 'flex' : 'hidden md:flex',
        )}
      >
        {activeChatId ? (
          <ChatPanel
            chatId={activeChatId}
            title={activeChat?.title ?? 'Chat'}
            streamState={streamForActiveChat}
            onSend={handleSend}
            onStop={stream.stop}
            onBack={() => onSelectChat(undefined)}
            onDismissError={stream.clearError}
          />
        ) : (
          <ChatEmptyState
            creating={createChat.isPending}
            onNewChat={() => void handleNewChat()}
            onSuggest={(question) => void handleSuggest(question)}
          />
        )}
      </div>
    </div>
  )
}
