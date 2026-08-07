import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getErrorMessage } from '@/lib/axios'
import { chatService } from '@/services/chat.service'
import { chatsQueryKey } from './useChats'

export function useCreateChat(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { title?: string }) => chatService.create(workspaceId, input),
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatsQueryKey(workspaceId) })
    },
  })
}
