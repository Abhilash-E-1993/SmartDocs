import { API_BASE_URL, ApiRequestError, api, getAuthToken } from '@/lib/axios'
import type { ApiFailure, ApiSuccess } from '@/types/api'
import type { Chat, ChatMessage, ChatStreamEvent } from '@/types/chat'

const DEFAULT_TOP_K = 5

export interface StreamMessageOptions {
  topK?: number
  signal?: AbortSignal
  onEvent: (event: ChatStreamEvent) => void
}

async function readEventStream(response: Response, onEvent: (event: ChatStreamEvent) => void) {
  if (!response.body) {
    throw new ApiRequestError(0, 'STREAM_ERROR', 'The server did not return a stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        onEvent(JSON.parse(trimmed) as ChatStreamEvent)
      }
    }
  }

  const trailing = buffer.trim()
  if (trailing) {
    onEvent(JSON.parse(trailing) as ChatStreamEvent)
  }
}

export const chatService = {
  async list(workspaceId: string): Promise<Chat[]> {
    const { data } = await api.get<ApiSuccess<Chat[]>>(`/workspaces/${workspaceId}/chats`)
    return data.data
  },

  async getById(id: string): Promise<Chat> {
    const { data } = await api.get<ApiSuccess<Chat>>(`/chats/${id}`)
    return data.data
  },

  async create(workspaceId: string, input: { title?: string }): Promise<Chat> {
    const { data } = await api.post<ApiSuccess<Chat>>(`/workspaces/${workspaceId}/chats`, input)
    return data.data
  },

  async rename(id: string, input: { title: string }): Promise<Chat> {
    const { data } = await api.patch<ApiSuccess<Chat>>(`/chats/${id}`, input)
    return data.data
  },

  async remove(id: string): Promise<string> {
    await api.delete<ApiSuccess<{ id: string }>>(`/chats/${id}`)
    return id
  },

  async listMessages(chatId: string): Promise<ChatMessage[]> {
    const { data } = await api.get<ApiSuccess<ChatMessage[]>>(`/chats/${chatId}/messages`)
    return data.data
  },

  async streamMessage(
    chatId: string,
    content: string,
    options: StreamMessageOptions,
  ): Promise<void> {
    const token = await getAuthToken()
    const topK = options.topK ?? DEFAULT_TOP_K

    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages?topK=${topK}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal: options.signal,
    })

    if (!response.ok) {
      let failure: ApiFailure | null = null
      try {
        failure = (await response.json()) as ApiFailure
      } catch {
        // The error response body was not JSON; fall back to a generic message.
      }

      throw new ApiRequestError(
        response.status,
        failure?.error.code ?? 'STREAM_ERROR',
        failure?.error.message ?? 'Failed to send the message',
      )
    }

    await readEventStream(response, options.onEvent)
  },
}
