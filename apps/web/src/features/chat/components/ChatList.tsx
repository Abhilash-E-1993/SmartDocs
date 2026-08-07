import { MessageSquare, Plus } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatListItem } from '@/features/chat/components/ChatListItem'
import { RenameChatDialog } from '@/features/chat/components/RenameChatDialog'
import { useDeleteChat } from '@/features/chat/hooks/useDeleteChat'
import { getErrorMessage } from '@/lib/axios'
import type { Chat } from '@/types/chat'

interface ChatListProps {
  workspaceId: string
  chats: Chat[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  activeChatId: string | undefined
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  creating: boolean
}

export function ChatList({
  workspaceId,
  chats,
  isLoading,
  isError,
  error,
  onRetry,
  activeChatId,
  onSelectChat,
  onNewChat,
  creating,
}: ChatListProps) {
  const deleteChat = useDeleteChat(workspaceId)
  const [renaming, setRenaming] = useState<Chat | null>(null)
  const [deleting, setDeleting] = useState<Chat | null>(null)

  const handleDelete = async (): Promise<void> => {
    if (!deleting) {
      return
    }

    try {
      await deleteChat.mutateAsync(deleting.id)
      setDeleting(null)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          Chats
          {chats && chats.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{chats.length}</span>
          ) : null}
        </h3>
        <Button size="sm" variant="outline" onClick={onNewChat} disabled={creating}>
          <Plus className="size-4" />
          {creating ? 'Creating…' : 'New chat'}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-2">
            {['a', 'b', 'c'].map((key) => (
              <Skeleton key={key} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Could not load chats"
            message={getErrorMessage(error)}
            onRetry={onRetry}
          />
        ) : chats && chats.length > 0 ? (
          <div className="space-y-1.5">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onSelect={() => onSelectChat(chat.id)}
                onRename={() => setRenaming(chat)}
                onDelete={() => setDeleting(chat)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No chats yet"
            description="Start a conversation and ask questions about your sources."
            className="py-10"
          />
        )}
      </div>

      <RenameChatDialog chat={renaming} workspaceId={workspaceId} onOpenChange={() => setRenaming(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
          }
        }}
        title="Delete chat"
        description={`"${deleting?.title ?? ''}" and all its messages will be permanently deleted.`}
        confirmLabel="Delete"
        loading={deleteChat.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
