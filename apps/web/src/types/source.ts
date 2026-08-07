export type SourceType = 'pdf' | 'text' | 'markdown' | 'website' | 'youtube'

export type SourceStatus = 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'INDEXING' | 'READY' | 'FAILED'

export interface SourceMetadata {
  url: string | null
  videoId: string | null
  fileSizeBytes: number | null
  pageCount: number | null
}

export interface Source {
  id: string
  workspaceId: string
  sourceType: SourceType
  title: string
  status: SourceStatus
  errorMessage: string | null
  chunkCount: number
  characterCount: number
  metadata: SourceMetadata
  queuedAt: string | null
  processingStartedAt: string | null
  processedAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SourceDetail extends Source {
  cloudinaryUrl: string | null
  contentPreview: string | null
}
