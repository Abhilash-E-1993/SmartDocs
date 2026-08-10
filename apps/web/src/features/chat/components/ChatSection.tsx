import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { ChatList } from '@/features/chat/components/ChatList'
import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { ChatWelcome } from '@/features/chat/components/ChatWelcome'
import { chatsQueryKey, useChats } from '@/features/chat/hooks/useChats'
import { useChatStream } from '@/features/chat/hooks/useChatStream'
import { useCreateChat } from '@/features/chat/hooks/useCreateChat'
import type { Chat } from '@/types/chat'

interface ChatSectionProps {
  workspaceId: string
  activeChatId: string | undefined
  onSelectChat: (chatId: string | undefined) => void
}

export function ChatSection({ workspaceId, activeChatId, onSelectChat }: ChatSectionProps) {
  const queryClient = useQueryClient()
  const { data: chats, isLoading, isError, error, refetch } = useChats(workspaceId)
  const createChat = useCreateChat(workspaceId)
  const stream = useChatStream(workspaceId)
  const [listOpen, setListOpen] = useState(false)
  // A chat that was just created but hasn't appeared in the refetched list
  // yet — it must never be treated as "missing" by the guard below.
  const [pendingChatId, setPendingChatId] = useState<string | null>(null)

  const activeChat = chats?.find((chat) => chat.id === activeChatId)
  const streamForActiveChat =
    activeChatId && stream.state.chatId === activeChatId ? stream.state : null

  // Clear the pending marker once the chat list catches up.
  useEffect(() => {
    if (pendingChatId && chats?.some((chat) => chat.id === pendingChatId)) {
      setPendingChatId(null)
    }
  }, [chats, pendingChatId])

  // Fall back to the welcome screen when the selected chat is gone (e.g.
  // deleted) — but never bounce a freshly created or actively streaming chat.
  useEffect(() => {
    if (!activeChatId || !chats) {
      return
    }
    if (chats.some((chat) => chat.id === activeChatId)) {
      return
    }
    if (activeChatId === pendingChatId || stream.state.chatId === activeChatId) {
      return
    }
    onSelectChat(undefined)
  }, [activeChatId, chats, pendingChatId, onSelectChat, stream.state.chatId])

  // "New chat" is instant: the composer opens right away and the chat is only
  // created on the server when the first message is sent — no waiting, and no
  // abandoned empty chats.
  const handleNewChat = (): void => {
    setListOpen(false)
    onSelectChat(undefined)
  }

  const handleSelectChat = (chatId: string): void => {
    setListOpen(false)
    onSelectChat(chatId)
  }

  const startChatWith = async (content: string): Promise<void> => {
    try {
      const chat = await createChat.mutateAsync({})
      // Insert the chat into the cache immediately so the list (and the guard
      // above) see it before the invalidation refetch lands.
      queryClient.setQueryData<Chat[]>(chatsQueryKey(workspaceId), (previous) =>
        previous?.some((existing) => existing.id === chat.id)
          ? previous
          : [chat, ...(previous ?? [])],
      )
      setPendingChatId(chat.id)
      onSelectChat(chat.id)
      await stream.send(chat.id, content)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  const handleSend = (content: string): void => {
    if (activeChatId) {
      void stream.send(activeChatId, content)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {activeChatId ? (
        <ChatPanel
          chatId={activeChatId}
          title={activeChat?.title ?? 'Chat'}
          streamState={streamForActiveChat}
          onSend={handleSend}
          onStop={stream.stop}
          onOpenList={() => setListOpen(true)}
          onNewChat={handleNewChat}
          onDismissError={stream.clearError}
        />
      ) : (
        <ChatWelcome
          starting={createChat.isPending}
          hasChats={(chats?.length ?? 0) > 0}
          onSend={(content) => void startChatWith(content)}
          onBrowseChats={() => setListOpen(true)}
        />
      )}

      {listOpen ? (
        <div className="absolute inset-0 z-20 flex">
          <div className="h-full w-full max-w-72 border-r bg-background p-3 shadow-xl animate-in duration-200 slide-in-from-left">
            <ChatList
              workspaceId={workspaceId}
              chats={chats}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={() => void refetch()}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              onClose={() => setListOpen(false)}
            />
          </div>
          <button
            type="button"
            aria-label="Close chat list"
            onClick={() => setListOpen(false)}
            className="flex-1 cursor-default bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-200"
          />
        </div>
      ) : null}
    </div>
  )
}
