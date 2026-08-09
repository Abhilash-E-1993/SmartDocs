import type { SourceType } from '../sources/Source'
import type { ChatDocument } from './Chat'
import type { MessageDocument, MessageRole } from './Message'

export interface CitationResponse {
  chunkId: string
  sourceId: string
  sourceTitle: string
  sourceType: SourceType
  chunkIndex: number
  content: string
  score: number
}

export interface MessageResponse {
  id: string
  chatId: string
  role: MessageRole
  content: string
  citations: CitationResponse[]
  verificationScore: number | null
  memories: string[]
  createdAt: string
}

export interface ChatResponse {
  id: string
  workspaceId: string
  title: string
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export function toMessageResponse(message: MessageDocument): MessageResponse {
  return {
    id: message._id.toString(),
    chatId: message.chatId.toString(),
    role: message.role,
    content: message.content,
    citations: message.citations.map((citation) => ({
      chunkId: citation.chunkId,
      sourceId: citation.sourceId,
      sourceTitle: citation.sourceTitle,
      sourceType: citation.sourceType,
      chunkIndex: citation.chunkIndex,
      content: citation.content,
      score: citation.score,
    })),
    verificationScore: message.verificationScore ?? null,
    memories: message.memories,
    createdAt: message.createdAt.toISOString(),
  }
}

export function toChatResponse(chat: ChatDocument): ChatResponse {
  return {
    id: chat._id.toString(),
    workspaceId: chat.workspaceId.toString(),
    title: chat.title,
    messageCount: chat.messageCount,
    lastMessageAt: chat.lastMessageAt ? chat.lastMessageAt.toISOString() : null,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  }
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
  | { type: 'final'; message: MessageResponse }
  | { type: 'error'; message: string }
