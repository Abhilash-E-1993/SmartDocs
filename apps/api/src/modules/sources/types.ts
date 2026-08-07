import type { SourceDocument, SourceStatus, SourceType } from './Source'

export interface SourceMetadataResponse {
  url: string | null
  videoId: string | null
  fileSizeBytes: number | null
  pageCount: number | null
}

export interface SourceResponse {
  id: string
  workspaceId: string
  sourceType: SourceType
  title: string
  status: SourceStatus
  errorMessage: string | null
  chunkCount: number
  characterCount: number
  metadata: SourceMetadataResponse
  queuedAt: string | null
  processingStartedAt: string | null
  processedAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SourceDetailResponse extends SourceResponse {
  cloudinaryUrl: string | null
  contentPreview: string | null
}

function toIso(value: Date | undefined): string | null {
  return value ? value.toISOString() : null
}

export function toSourceResponse(source: SourceDocument): SourceResponse {
  return {
    id: source._id.toString(),
    workspaceId: source.workspaceId.toString(),
    sourceType: source.sourceType,
    title: source.title,
    status: source.status,
    errorMessage: source.errorMessage ?? null,
    chunkCount: source.chunkCount,
    characterCount: source.characterCount,
    metadata: {
      url: source.metadata.url ?? null,
      videoId: source.metadata.videoId ?? null,
      fileSizeBytes: source.metadata.fileSizeBytes ?? null,
      pageCount: source.metadata.pageCount ?? null,
    },
    queuedAt: toIso(source.queuedAt),
    processingStartedAt: toIso(source.processingStartedAt),
    processedAt: toIso(source.processedAt),
    failedAt: toIso(source.failedAt),
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }
}

export function toSourceDetailResponse(source: SourceDocument): SourceDetailResponse {
  return {
    ...toSourceResponse(source),
    cloudinaryUrl: source.cloudinaryUrl ?? null,
    contentPreview: source.contentPreview ?? null,
  }
}
