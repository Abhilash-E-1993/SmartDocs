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
  /** SHA-256 of the cleaned text — used to deduplicate identical content. */
  contentHash?: string
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
  /** Short subject label generated at index time (e.g. "React hooks tutorial"). */
  topic?: string
  /** One-sentence description of what the source covers. */
  topicSummary?: string
  rawContent?: string
  errorMessage?: string
  contentPreview?: string
  /** 0-100 processing progress, updated live by the pipeline (drives the UI bar). */
  progress: number
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
    contentHash: { type: String },
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
    topic: { type: String },
    topicSummary: { type: String },
    rawContent: { type: String },
    errorMessage: { type: String },
    contentPreview: { type: String },
    progress: { type: Number, default: 0, min: 0, max: 100 },
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
sourceSchema.index({ workspaceId: 1, 'metadata.contentHash': 1 })

export const SourceModel: Model<ISource> = model<ISource>('Source', sourceSchema)
