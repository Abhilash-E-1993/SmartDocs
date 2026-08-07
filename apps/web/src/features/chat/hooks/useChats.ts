import { useQuery } from '@tanstack/react-query'

import { chatService } from '@/services/chat.service'

export function chatsQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'chats'] as const
}

export function useChats(workspaceId: string) {
  return useQuery({
    queryKey: chatsQueryKey(workspaceId),
    queryFn: () => chatService.list(workspaceId),
  })
}
