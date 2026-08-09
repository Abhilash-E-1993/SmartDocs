import type { SourceType } from '@/types/source'

export type MessageRole = 'user' | 'assistant'

export interface ChatCitation {
  chunkId: string
  sourceId: string
  sourceTitle: string
  sourceType: SourceType
  chunkIndex: number
  content: string
  score: number
}

export interface ChatMessage {
  id: string
  chatId: string
  role: MessageRole
  content: string
  citations: ChatCitation[]
  verificationScore: number | null
  memories: string[]
  createdAt: string
}

export interface Chat {
  id: string
  workspaceId: string
  title: string
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export type ChatStreamStage =
  'rewriting' | 'searching' | 'ranking' | 'generating' | 'verifying' | 'retrying'

export type ChatStreamEvent =
  | {
      type: 'meta'
      chatId: string
      chatTitle: string
      titleGenerated: boolean
      userMessageId: string
    }
  | { type: 'status'; stage: ChatStreamStage; attempt: number }
  | { type: 'token'; content: string }
  | { type: 'final'; message: ChatMessage }
  | { type: 'error'; message: string }
