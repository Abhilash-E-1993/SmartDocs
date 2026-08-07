import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRenameChat } from '@/features/chat/hooks/useRenameChat'
import type { Chat } from '@/types/chat'

interface RenameChatDialogProps {
  chat: Chat | null
  workspaceId: string
  onOpenChange: (open: boolean) => void
}

export function RenameChatDialog({ chat, workspaceId, onOpenChange }: RenameChatDialogProps) {
  const renameChat = useRenameChat(workspaceId)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (chat) {
      setTitle(chat.title)
    }
  }, [chat])

  const open = chat !== null
  const trimmed = title.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 120 && !renameChat.isPending

  const handleSubmit = async (): Promise<void> => {
    if (!chat || !canSave) {
      return
    }

    try {
      await renameChat.mutateAsync({ id: chat.id, title: trimmed })
      onOpenChange(false)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
          <DialogDescription>Give this conversation a new title.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="chat-title">Title</Label>
            <Input
              id="chat-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              autoComplete="off"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={renameChat.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {renameChat.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
