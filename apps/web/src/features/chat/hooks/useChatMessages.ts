import { useQuery } from '@tanstack/react-query'

import { chatService } from '@/services/chat.service'

export function messagesQueryKey(chatId: string) {
  return ['chats', chatId, 'messages'] as const
}

export function useChatMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: messagesQueryKey(chatId ?? ''),
    queryFn: () => {
      if (!chatId) {
        throw new Error('chatId is required')
      }

      return chatService.listMessages(chatId)
    },
    enabled: Boolean(chatId),
  })
}
