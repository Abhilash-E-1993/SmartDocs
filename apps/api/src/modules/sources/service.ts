import { inngest } from '../../jobs/client'
import { cloudinaryService } from '../../services/cloudinary.service'
import { pineconeService } from '../../services/pinecone.service'
import { youtubeService } from '../../services/youtube.service'
import { ApiError } from '../../utils/api-error'
import type { TextChunk } from '../../utils/chunk-text'
import { workspaceService } from '../workspace/service'
import { SourceModel, type SourceDocument, type SourceType } from './Source'
import { SourceChunkModel, type SourceChunkDocument } from './SourceChunk'

const PROCESS_EVENTS: Record<SourceType, string> = {
  pdf: 'sources/pdf.process',
  text: 'sources/text.process',
  markdown: 'sources/text.process',
  website: 'sources/website.process',
  youtube: 'sources/youtube.process',
}

interface UploadedFile {
  buffer: Buffer
  originalname: string
  size: number
}

async function assertWorkspaceOwnership(workspaceId: string, ownerId: string): Promise<void> {
  await workspaceService.getByIdForOwner(workspaceId, ownerId)
}

async function markFailed(id: string, message: string): Promise<void> {
  await SourceModel.findByIdAndUpdate(id, {
    status: 'FAILED',
    errorMessage: message.slice(0, 500),
    failedAt: new Date(),
  })
}

async function dispatchProcessing(source: SourceDocument): Promise<void> {
  try {
    await inngest.send({
      name: PROCESS_EVENTS[source.sourceType],
      data: { sourceId: source._id.toString() },
    })
  } catch {
    await markFailed(source._id.toString(), 'Failed to queue the processing job')
    throw ApiError.serviceUnavailable('Processing queue is not available')
  }
}

async function queueSource(source: SourceDocument): Promise<SourceDocument> {
  source.status = 'QUEUED'
  source.queuedAt = new Date()
  await source.save()
  await dispatchProcessing(source)
  return source
}

async function listByWorkspace(workspaceId: string, ownerId: string): Promise<SourceDocument[]> {
  await assertWorkspaceOwnership(workspaceId, ownerId)
  return SourceModel.find({ workspaceId, ownerId }).sort({ createdAt: -1 })
}

async function getByIdForOwner(id: string, ownerId: string): Promise<SourceDocument> {
  const source = await SourceModel.findOne({ _id: id, ownerId })
  if (!source) {
    throw ApiError.notFound('Source not found')
  }

  return source
}

async function getById(id: string): Promise<SourceDocument> {
  const source = await SourceModel.findById(id)
  if (!source) {
    throw ApiError.notFound('Source not found')
  }

  return source
}

async function createPdfSource(
  workspaceId: string,
  ownerId: string,
  file: UploadedFile,
  title?: string,
): Promise<SourceDocument> {
  await assertWorkspaceOwnership(workspaceId, ownerId)

  const source = await SourceModel.create({
    workspaceId,
    ownerId,
    sourceType: 'pdf',
    title: title?.trim() || file.originalname.replace(/\.pdf$/i, '') || 'PDF document',
    status: 'UPLOADING',
    metadata: { fileSizeBytes: file.size },
  })

  try {
    const uploaded = await cloudinaryService.uploadPdf(file.buffer, source._id.toString())
    source.cloudinaryUrl = uploaded.url
    source.cloudinaryPublicId = uploaded.publicId
    source.metadata.fileSizeBytes = uploaded.bytes
  } catch (error) {
    await SourceModel.deleteOne({ _id: source._id })
    throw error
  }

  return queueSource(source)
}

async function createTextSource(
  workspaceId: string,
  ownerId: string,
  kind: 'text' | 'markdown',
  title: string,
  content: string,
): Promise<SourceDocument> {
  await assertWorkspaceOwnership(workspaceId, ownerId)

  const source = await SourceModel.create({
    workspaceId,
    ownerId,
    sourceType: kind,
    title,
    rawContent: content,
  })

  return queueSource(source)
}

async function createWebsiteSource(
  workspaceId: string,
  ownerId: string,
  url: string,
  title?: string,
): Promise<SourceDocument> {
  await assertWorkspaceOwnership(workspaceId, ownerId)

  const source = await SourceModel.create({
    workspaceId,
    ownerId,
    sourceType: 'website',
    title: title?.trim() || new URL(url).hostname,
    metadata: { url },
  })

  return queueSource(source)
}

async function createYoutubeSource(
  workspaceId: string,
  ownerId: string,
  url: string,
  title?: string,
): Promise<SourceDocument> {
  await assertWorkspaceOwnership(workspaceId, ownerId)

  const videoId = youtubeService.extractVideoId(url)
  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  const source = await SourceModel.create({
    workspaceId,
    ownerId,
    sourceType: 'youtube',
    title: title?.trim() || `YouTube video (${videoId})`,
    metadata: { url, videoId },
  })

  return queueSource(source)
}

async function renameForOwner(id: string, ownerId: string, title: string): Promise<SourceDocument> {
  const source = await SourceModel.findOneAndUpdate(
    { _id: id, ownerId },
    { title },
    { returnDocument: 'after', runValidators: true },
  )
  if (!source) {
    throw ApiError.notFound('Source not found')
  }

  return source
}

async function deleteForOwner(id: string, ownerId: string): Promise<void> {
  const source = await SourceModel.findOneAndDelete({ _id: id, ownerId })
  if (!source) {
    throw ApiError.notFound('Source not found')
  }

  await SourceChunkModel.deleteMany({ sourceId: source._id })
  await pineconeService.deleteBySource(id)

  if (source.cloudinaryPublicId) {
    await cloudinaryService.deletePdf(source.cloudinaryPublicId)
  }
}

async function retryForOwner(id: string, ownerId: string): Promise<SourceDocument> {
  const source = await getByIdForOwner(id, ownerId)
  if (source.status !== 'FAILED') {
    throw ApiError.badRequest('Only failed sources can be retried')
  }

  source.errorMessage = undefined
  source.failedAt = undefined
  return queueSource(source)
}

async function markProcessing(id: string): Promise<void> {
  await SourceModel.findByIdAndUpdate(id, {
    status: 'PROCESSING',
    processingStartedAt: new Date(),
  })
}

async function markIndexing(id: string): Promise<void> {
  await SourceModel.findByIdAndUpdate(id, { status: 'INDEXING' })
}

async function markReady(id: string): Promise<void> {
  await SourceModel.findByIdAndUpdate(id, {
    status: 'READY',
    processedAt: new Date(),
    $unset: { errorMessage: '', failedAt: '' },
  })
}

async function setExtractedMetadata(id: string, metadata: { pageCount?: number }): Promise<void> {
  await SourceModel.findByIdAndUpdate(id, { $set: { 'metadata.pageCount': metadata.pageCount } })
}

async function storeChunks(
  id: string,
  cleanedText: string,
  chunks: TextChunk[],
): Promise<SourceChunkDocument[]> {
  const source = await getById(id)

  await SourceChunkModel.deleteMany({ sourceId: source._id })

  const inserted =
    chunks.length > 0
      ? await SourceChunkModel.insertMany(
          chunks.map((chunk) => ({
            workspaceId: source.workspaceId,
            sourceId: source._id,
            ownerId: source.ownerId,
            sourceType: source.sourceType,
            chunkIndex: chunk.chunkIndex,
            startOffset: chunk.startOffset,
            content: chunk.content,
          })),
        )
      : []

  source.rawContent = cleanedText
  source.chunkCount = chunks.length
  source.characterCount = cleanedText.length
  source.contentPreview = cleanedText.slice(0, 400)
  await source.save()

  return inserted
}

export const sourceService = {
  listByWorkspace,
  getByIdForOwner,
  getById,
  createPdfSource,
  createTextSource,
  createWebsiteSource,
  createYoutubeSource,
  renameForOwner,
  deleteForOwner,
  retryForOwner,
  markProcessing,
  markIndexing,
  markReady,
  markFailed,
  setExtractedMetadata,
  storeChunks,
}
