import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose'

export const DEFAULT_CHAT_TITLE = 'New chat'

export interface IChat {
  workspaceId: Types.ObjectId
  ownerId: Types.ObjectId
  title: string
  messageCount: number
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type ChatDocument = HydratedDocument<IChat>

const chatSchema = new Schema<IChat>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
)

chatSchema.index({ workspaceId: 1, lastMessageAt: -1 })
chatSchema.index({ ownerId: 1, workspaceId: 1 })

export const ChatModel: Model<IChat> = model<IChat>('Chat', chatSchema)
