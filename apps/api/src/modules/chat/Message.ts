import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose'

import { SOURCE_TYPES, type SourceType } from '../sources/Source'

export const MESSAGE_ROLES = ['user', 'assistant'] as const
export type MessageRole = (typeof MESSAGE_ROLES)[number]

export interface IMessageCitation {
  chunkId: string
  sourceId: string
  sourceTitle: string
  sourceType: SourceType
  chunkIndex: number
  content: string
  score: number
}

export interface IMessage {
  chatId: Types.ObjectId
  workspaceId: Types.ObjectId
  ownerId: Types.ObjectId
  role: MessageRole
  content: string
  citations: IMessageCitation[]
  verificationScore?: number
  memories: string[]
  createdAt: Date
  updatedAt: Date
}

export type MessageDocument = HydratedDocument<IMessage>

const citationSchema = new Schema<IMessageCitation>(
  {
    chunkId: { type: String, required: true },
    sourceId: { type: String, required: true },
    sourceTitle: { type: String, required: true },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    score: { type: Number, required: true },
  },
  { _id: false },
)

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: MESSAGE_ROLES, required: true },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
    verificationScore: { type: Number },
    memories: { type: [String], default: [] },
  },
  { timestamps: true },
)

messageSchema.index({ chatId: 1, createdAt: 1 })

export const MessageModel: Model<IMessage> = model<IMessage>('Message', messageSchema)
