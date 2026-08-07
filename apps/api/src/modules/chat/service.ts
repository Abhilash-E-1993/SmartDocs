import { ApiError } from '../../utils/api-error'
import { workspaceService } from '../workspace/service'
import { ChatModel, DEFAULT_CHAT_TITLE, type ChatDocument } from './Chat'
import { MessageModel, type IMessageCitation, type MessageDocument, type MessageRole } from './Message'

const HISTORY_LIMIT = 10

async function listByWorkspace(workspaceId: string, ownerId: string): Promise<ChatDocument[]> {
  await workspaceService.getByIdForOwner(workspaceId, ownerId)
  return ChatModel.find({ workspaceId, ownerId }).sort({ lastMessageAt: -1, createdAt: -1 })
}

async function getByIdForOwner(id: string, ownerId: string): Promise<ChatDocument> {
  const chat = await ChatModel.findOne({ _id: id, ownerId })
  if (!chat) {
    throw ApiError.notFound('Chat not found')
  }

  return chat
}

async function createForOwner(
  workspaceId: string,
  ownerId: string,
  title?: string,
): Promise<ChatDocument> {
  await workspaceService.getByIdForOwner(workspaceId, ownerId)
  return ChatModel.create({ workspaceId, ownerId, title: title?.trim() || DEFAULT_CHAT_TITLE })
}

async function renameForOwner(
  id: string,
  ownerId: string,
  title: string,
): Promise<ChatDocument> {
  const chat = await ChatModel.findOneAndUpdate(
    { _id: id, ownerId },
    { title },
    { returnDocument: 'after', runValidators: true },
  )
  if (!chat) {
    throw ApiError.notFound('Chat not found')
  }

  return chat
}

async function deleteForOwner(id: string, ownerId: string): Promise<void> {
  const chat = await ChatModel.findOneAndDelete({ _id: id, ownerId })
  if (!chat) {
    throw ApiError.notFound('Chat not found')
  }

  await MessageModel.deleteMany({ chatId: chat._id })
}

async function listMessages(chatId: string, ownerId: string): Promise<MessageDocument[]> {
  await getByIdForOwner(chatId, ownerId)
  return MessageModel.find({ chatId }).sort({ createdAt: 1 })
}

async function getRecentHistory(chatId: string): Promise<MessageDocument[]> {
  const recent = await MessageModel.find({ chatId }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT)
  return recent.reverse()
}

interface AppendMessageInput {
  chatId: string
  workspaceId: string
  ownerId: string
  role: MessageRole
  content: string
  citations?: IMessageCitation[]
  verificationScore?: number
  memories?: string[]
}

async function appendMessage(input: AppendMessageInput): Promise<MessageDocument> {
  const message = await MessageModel.create({
    chatId: input.chatId,
    workspaceId: input.workspaceId,
    ownerId: input.ownerId,
    role: input.role,
    content: input.content,
    citations: input.citations ?? [],
    verificationScore: input.verificationScore,
    memories: input.memories ?? [],
  })

  await ChatModel.findByIdAndUpdate(input.chatId, {
    $inc: { messageCount: 1 },
    lastMessageAt: new Date(),
  })

  return message
}

async function setAutoTitle(chatId: string, title: string): Promise<void> {
  await ChatModel.findOneAndUpdate({ _id: chatId, title: DEFAULT_CHAT_TITLE }, { title })
}

export const chatService = {
  listByWorkspace,
  getByIdForOwner,
  createForOwner,
  renameForOwner,
  deleteForOwner,
  listMessages,
  getRecentHistory,
  appendMessage,
  setAutoTitle,
}
