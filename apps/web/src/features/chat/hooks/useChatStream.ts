import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getErrorMessage } from '@/lib/axios'
import { chatService } from '@/services/chat.service'
import type { ChatStreamEvent, ChatStreamStage } from '@/types/chat'
import { messagesQueryKey } from './useChatMessages'
import { chatsQueryKey } from './useChats'

export interface ChatStreamState {
  active: boolean
  chatId: string | null
  question: string | null
  stage: ChatStreamStage | null
  attempt: number
  content: string
  error: string | null
}

const IDLE_STREAM: ChatStreamState = {
  active: false,
  chatId: null,
  question: null,
  stage: null,
  attempt: 1,
  content: '',
  error: null,
}

export function useChatStream(workspaceId: string) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<ChatStreamState>(IDLE_STREAM)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const stop = useCallback(() => {
    const chatId = state.chatId
    abortRef.current?.abort()
    abortRef.current = null
    setState(IDLE_STREAM)
    if (chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(chatId) })
    }
  }, [queryClient, state.chatId])

  const send = useCallback(
    async (chatId: string, content: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({
        active: true,
        chatId,
        question: content,
        stage: null,
        attempt: 1,
        content: '',
        error: null,
      })

      const onEvent = (event: ChatStreamEvent): void => {
        if (event.type === 'meta') {
          if (event.titleGenerated) {
            void queryClient.invalidateQueries({ queryKey: chatsQueryKey(workspaceId) })
          }
          return
        }

        if (event.type === 'status') {
          setState((previous) => {
            if (!previous.active) {
              return previous
            }

            const attemptChanged = event.attempt !== previous.attempt
            return {
              ...previous,
              stage: event.stage,
              attempt: event.attempt,
              content: attemptChanged ? '' : previous.content,
            }
          })
          return
        }

        if (event.type === 'token') {
          setState((previous) =>
            previous.active ? { ...previous, content: previous.content + event.content } : previous,
          )
          return
        }

        if (event.type === 'final') {
          setState((previous) =>
            previous.active ? { ...previous, content: event.message.content } : previous,
          )
          return
        }

        setState((previous) =>
          previous.active
            ? { ...previous, active: false, stage: null, question: null, error: event.message }
            : previous,
        )
      }

      try {
        await chatService.streamMessage(chatId, content, { signal: controller.signal, onEvent })
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            ...previous,
            active: false,
            stage: null,
            question: null,
            error: getErrorMessage(error),
          }))
        }
      } finally {
        await queryClient.invalidateQueries({ queryKey: messagesQueryKey(chatId) })
        await queryClient.invalidateQueries({ queryKey: chatsQueryKey(workspaceId) })
        setState((previous) =>
          previous.chatId === chatId && previous.active ? IDLE_STREAM : previous,
        )
      }
    },
    [queryClient, workspaceId],
  )

  const clearError = useCallback(() => {
    setState((previous) => (previous.error ? { ...previous, error: null } : previous))
  }, [])

  return { state, send, stop, clearError }
}
