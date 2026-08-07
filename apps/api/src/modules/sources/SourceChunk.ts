import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose'

import { SOURCE_TYPES, type SourceType } from './Source'

export interface ISourceChunk {
  workspaceId: Types.ObjectId
  sourceId: Types.ObjectId
  ownerId: Types.ObjectId
  sourceType: SourceType
  chunkIndex: number
  startOffset: number
  content: string
  createdAt: Date
  updatedAt: Date
}

export type SourceChunkDocument = HydratedDocument<ISourceChunk>

const sourceChunkSchema = new Schema<ISourceChunk>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sourceId: { type: Schema.Types.ObjectId, ref: 'Source', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    chunkIndex: { type: Number, required: true },
    startOffset: { type: Number, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
)

sourceChunkSchema.index({ sourceId: 1, chunkIndex: 1 }, { unique: true })

export const SourceChunkModel: Model<ISourceChunk> = model<ISourceChunk>(
  'SourceChunk',
  sourceChunkSchema,
)
