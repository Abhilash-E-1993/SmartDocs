import { createHash } from 'node:crypto'

import { logger } from '../config/logger'
import { sourceService } from '../modules/sources/service'
import type { SourceDocument } from '../modules/sources/Source'
import type { SourceChunkDocument } from '../modules/sources/SourceChunk'
import { openaiService } from '../services/openai.service'
import { pineconeService } from '../services/pinecone.service'
import { chunkText } from '../utils/chunk-text'

const MIN_CONTENT_LENGTH = 10

export interface SourceProcessEventData {
  sourceId: string
}

export function hashSourceContent(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Labels a source with its topic when it does not have one yet. */
async function labelSourceTopic(source: SourceDocument, cleanedText: string): Promise<void> {
  if (source.topic) {
    return
  }

  const result = await openaiService.generateSourceTopic(
    source.title,
    source.sourceType,
    cleanedText,
  )
  if (result) {
    await sourceService.setTopic(source._id.toString(), result.topic, result.summary)
  }
}

/** Embeds the stored chunks and upserts them into the vector index. */
async function embedAndUpsert(
  source: SourceDocument,
  chunks: SourceChunkDocument[],
): Promise<void> {
  const sourceId = source._id.toString()
  await pineconeService.deleteBySource(sourceId)

  // 65 → 88 while embedding batches complete.
  const embeddings = await openaiService.generateEmbeddings(
    chunks.map((chunk) =>
      chunk.contextSummary ? `${chunk.contextSummary}\n${chunk.content}` : chunk.content,
    ),
    (done, total) => void sourceService.setProgress(sourceId, 65 + (23 * done) / total),
  )
  if (embeddings.length !== chunks.length) {
    throw new Error('Embedding generation returned an unexpected number of vectors')
  }

  await sourceService.setProgress(sourceId, 90)
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
  await sourceService.setProgress(sourceId, 95)
}

/**
 * Clones the already-indexed chunks of a duplicate source (identical cleaned
 * text) instead of paying the full enrichment cost again. Embedding/upsert is
 * done afterwards by the shared vectorize step, exactly like fresh chunks.
 */
async function cloneIndexedChunks(
  source: SourceDocument,
  donor: SourceDocument,
  cleanedText: string,
  contentHash: string,
): Promise<boolean> {
  const donorChunks = await sourceService.getChunksBySourceId(donor._id.toString())
  if (donorChunks.length === 0) {
    return false
  }

  await sourceService.storeChunks(
    source._id.toString(),
    cleanedText,
    donorChunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      startOffset: chunk.startOffset,
      content: chunk.content,
      contextSummary: chunk.contextSummary,
    })),
    contentHash,
  )

  if (donor.topic) {
    await sourceService.setTopic(source._id.toString(), donor.topic, donor.topicSummary ?? '')
  }

  return true
}

/* --------------------------------------------------------------------------
 * Durable indexing steps — the pipeline is split into memoized Inngest steps
 * so a failed run resumes at the failed step instead of redoing minutes of
 * finished work (critical for long YouTube videos and large websites).
 * ------------------------------------------------------------------------ */

export interface PrepareChunksResult {
  cloned: boolean
  chunkCount: number
}

/**
 * Step 1: dedup check → chunk → contextual enrichment → store chunks in
 * Mongo. Progress: 30 (indexing) → 65 (chunks stored).
 */
export async function prepareSourceChunks(
  sourceId: string,
  cleanedText: string,
): Promise<PrepareChunksResult> {
  if (cleanedText.length < MIN_CONTENT_LENGTH) {
    throw new Error('Not enough text could be extracted from this source')
  }

  await sourceService.markIndexing(sourceId)
  const source = await sourceService.getById(sourceId)
  const contentHash = hashSourceContent(cleanedText)

  // Deduplication: if identical content is already indexed in this workspace,
  // clone its chunks instead of re-running the enrichment.
  const donor = await sourceService.findReadyDuplicateByHash(
    source.workspaceId.toString(),
    sourceId,
    contentHash,
  )
  if (donor) {
    logger.info(
      { sourceId, donorId: donor._id.toString() },
      'Duplicate source content detected, cloning the existing index',
    )
    if (await cloneIndexedChunks(source, donor, cleanedText, contentHash)) {
      await sourceService.setProgress(sourceId, 65)
      return { cloned: true, chunkCount: donor.chunkCount }
    }
    // The donor had no chunks to clone — fall through to full indexing.
  }

  const textChunks = chunkText(cleanedText)

  // Contextual enrichment: one situating sentence per chunk, embedded together
  // with the chunk — substantially improves retrieval precision (contextual
  // retrieval), especially for transcripts without sentence punctuation.
  const contexts = await openaiService.generateChunkContexts(
    source.title,
    source.sourceType,
    textChunks.map((chunk) => chunk.content),
    (done, total) => void sourceService.setProgress(sourceId, 30 + (35 * done) / total),
  )
  const enrichedChunks = textChunks.map((chunk, index) => ({
    ...chunk,
    contextSummary: contexts[index] || undefined,
  }))

  const chunks = await sourceService.storeChunks(sourceId, cleanedText, enrichedChunks, contentHash)
  await sourceService.setProgress(sourceId, 65)

  return { cloned: false, chunkCount: chunks.length }
}

/**
 * Step 2: load the stored chunks, embed them and upsert into the vector
 * index. Progress: 65 → 95.
 */
export async function vectorizeSource(sourceId: string): Promise<void> {
  const source = await sourceService.getById(sourceId)
  const chunks = await sourceService.getChunksBySourceId(sourceId)
  if (chunks.length === 0) {
    throw new Error('No chunks were stored for this source')
  }

  await embedAndUpsert(source, chunks)
}

/**
 * Step 3: label the source topic. Non-fatal by design — the chat lazily
 * backfills missing topics, so a labeling hiccup never fails the source.
 */
export async function labelSource(sourceId: string, cleanedText: string): Promise<void> {
  const source = await sourceService.getById(sourceId)
  await labelSourceTopic(source, cleanedText)
  await sourceService.setProgress(sourceId, 97)
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

