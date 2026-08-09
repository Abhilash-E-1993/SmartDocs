import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Chat } from '@/types/chat'
import { formatRelativeTime } from '@/utils/formatDate'

interface ChatListItemProps {
  chat: Chat
  active: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}

export function ChatListItem({ chat, active, onSelect, onRename, onDelete }: ChatListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
        active ? 'border-border bg-accent shadow-xs' : 'border-transparent hover:bg-accent/60',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{chat.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {chat.messageCount} {chat.messageCount === 1 ? 'message' : 'messages'}
          {chat.lastMessageAt ? ` · ${formatRelativeTime(chat.lastMessageAt)}` : ''}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Chat actions"
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 transition-opacity focus-visible:opacity-100 data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
