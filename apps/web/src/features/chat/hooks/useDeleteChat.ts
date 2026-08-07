import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/axios'
import { chatService } from '@/services/chat.service'
import { chatsQueryKey } from './useChats'

export function useDeleteChat(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => chatService.remove(id),
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Chat deleted')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey(workspaceId) })
    },
  })
}
