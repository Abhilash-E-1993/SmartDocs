import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose'

export const SOURCE_TYPES = ['pdf', 'text', 'markdown', 'website', 'youtube'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const SOURCE_STATUSES = [
  'UPLOADING',
  'QUEUED',
  'PROCESSING',
  'INDEXING',
  'READY',
  'FAILED',
] as const
export type SourceStatus = (typeof SOURCE_STATUSES)[number]

export interface ISourceMetadata {
  url?: string
  videoId?: string
  fileSizeBytes?: number
  pageCount?: number
}

export interface ISource {
  workspaceId: Types.ObjectId
  ownerId: Types.ObjectId
  sourceType: SourceType
  title: string
  status: SourceStatus
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  metadata: ISourceMetadata
  rawContent?: string
  errorMessage?: string
  contentPreview?: string
  chunkCount: number
  characterCount: number
  queuedAt?: Date
  processingStartedAt?: Date
  processedAt?: Date
  failedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type SourceDocument = HydratedDocument<ISource>

const metadataSchema = new Schema<ISourceMetadata>(
  {
    url: { type: String },
    videoId: { type: String },
    fileSizeBytes: { type: Number },
    pageCount: { type: Number },
  },
  { _id: false },
)

const sourceSchema = new Schema<ISource>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    status: { type: String, enum: SOURCE_STATUSES, default: 'QUEUED' },
    cloudinaryUrl: { type: String },
    cloudinaryPublicId: { type: String },
    metadata: { type: metadataSchema, default: {} },
    rawContent: { type: String },
    errorMessage: { type: String },
    contentPreview: { type: String },
    chunkCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
    queuedAt: { type: Date },
    processingStartedAt: { type: Date },
    processedAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true },
)

sourceSchema.index({ workspaceId: 1, createdAt: -1 })
sourceSchema.index({ ownerId: 1, workspaceId: 1 })

export const SourceModel: Model<ISource> = model<ISource>('Source', sourceSchema)
