import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/axios'
import { chatService } from '@/services/chat.service'
import { chatsQueryKey } from './useChats'

export function useRenameChat(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { id: string; title: string }) =>
      chatService.rename(input.id, { title: input.title }),
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSuccess: () => {
      toast.success('Chat renamed')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey(workspaceId) })
    },
  })
}
