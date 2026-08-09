import { sourceService } from '../modules/sources/service'
import { openaiService } from '../services/openai.service'
import { pineconeService } from '../services/pinecone.service'
import { chunkText } from '../utils/chunk-text'

const MIN_CONTENT_LENGTH = 10

export interface SourceProcessEventData {
  sourceId: string
}

export async function indexSource(sourceId: string, cleanedText: string): Promise<void> {
  if (cleanedText.length < MIN_CONTENT_LENGTH) {
    throw new Error('Not enough text could be extracted from this source')
  }

  await sourceService.markIndexing(sourceId)
  const source = await sourceService.getById(sourceId)
  const textChunks = chunkText(cleanedText)

  // Contextual enrichment: one situating sentence per chunk, embedded together
  // with the chunk — substantially improves retrieval precision (contextual
  // retrieval), especially for transcripts without sentence punctuation.
  const contexts = await openaiService.generateChunkContexts(
    source.title,
    source.sourceType,
    textChunks.map((chunk) => chunk.content),
  )
  const enrichedChunks = textChunks.map((chunk, index) => ({
    ...chunk,
    contextSummary: contexts[index] || undefined,
  }))

  const chunks = await sourceService.storeChunks(sourceId, cleanedText, enrichedChunks)

  await pineconeService.deleteBySource(sourceId)

  const embeddings = await openaiService.generateEmbeddings(
    chunks.map((chunk) =>
      chunk.contextSummary ? `${chunk.contextSummary}\n${chunk.content}` : chunk.content,
    ),
  )
  if (embeddings.length !== chunks.length) {
    throw new Error('Embedding generation returned an unexpected number of vectors')
  }

  await pineconeService.upsertChunks(
    chunks.map((chunk, index) => ({
      chunkId: chunk._id.toString(),
      values: embeddings[index],
      workspaceId: source.workspaceId.toString(),
      sourceId: source._id.toString(),
      sourceType: source.sourceType,
      chunkIndex: chunk.chunkIndex,
      sourceTitle: source.title,
      originalPosition: chunk.startOffset,
    })),
  )
}

export async function completeSource(
  sourceId: string,
): Promise<{ sourceId: string; status: 'READY' }> {
  await sourceService.markReady(sourceId)
  return { sourceId, status: 'READY' }
}

export async function failSourceFromEvent(event: unknown, error: Error): Promise<void> {
  const data = (event as { data?: { event?: { data?: SourceProcessEventData } } }).data?.event?.data

  if (data?.sourceId) {
    await sourceService.markFailed(data.sourceId, error.message)
  }
}
