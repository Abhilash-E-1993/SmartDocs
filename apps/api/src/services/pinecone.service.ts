import { Pinecone, type Index, type RecordMetadata } from '@pinecone-database/pinecone'

import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'
import { EMBEDDING_DIMENSIONS } from './openai.service'

const UPSERT_BATCH_SIZE = 96

export interface ChunkVectorMetadata {
  workspaceId: string
  sourceId: string
  chunkId: string
  sourceType: string
  chunkIndex: number
  sourceTitle: string
  originalPosition: number
}

export interface ChunkVectorInput extends ChunkVectorMetadata {
  values: number[]
}

export interface VectorMatch {
  metadata: ChunkVectorMetadata
  score: number
}

let client: Pinecone | null = null
let indexPromise: Promise<Index> | null = null

export function isPineconeConfigured(): boolean {
  return Boolean(env.PINECONE_API_KEY)
}

function getClient(): Pinecone {
  if (!env.PINECONE_API_KEY) {
    throw ApiError.serviceUnavailable('Semantic search is not configured')
  }

  if (!client) {
    client = new Pinecone({ apiKey: env.PINECONE_API_KEY })
  }

  return client
}

async function ensureIndex(pinecone: Pinecone, name: string): Promise<void> {
  const existing = await pinecone.listIndexes()
  const found = existing.indexes?.some((index) => index.name === name) ?? false
  if (found) {
    return
  }

  logger.info({ index: name }, 'Creating Pinecone index')
  await pinecone.createIndex({
    name,
    dimension: EMBEDDING_DIMENSIONS,
    metric: 'cosine',
    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    deletionProtection: 'disabled',
    waitUntilReady: true,
  })
}

function getIndex(): Promise<Index> {
  if (!indexPromise) {
    const pinecone = getClient()
    indexPromise = ensureIndex(pinecone, env.PINECONE_INDEX_NAME)
      .then(() => pinecone.index(env.PINECONE_INDEX_NAME))
      .catch((error: unknown) => {
        indexPromise = null
        throw error
      })
  }

  return indexPromise
}

function toChunkMetadata(metadata: RecordMetadata | undefined): ChunkVectorMetadata | null {
  if (!metadata) {
    return null
  }

  const { workspaceId, sourceId, chunkId, sourceType, chunkIndex, sourceTitle, originalPosition } =
    metadata

  if (
    typeof workspaceId !== 'string' ||
    typeof sourceId !== 'string' ||
    typeof chunkId !== 'string' ||
    typeof sourceType !== 'string' ||
    typeof chunkIndex !== 'number' ||
    typeof sourceTitle !== 'string' ||
    typeof originalPosition !== 'number'
  ) {
    return null
  }

  return { workspaceId, sourceId, chunkId, sourceType, chunkIndex, sourceTitle, originalPosition }
}

async function upsertChunks(vectors: ChunkVectorInput[]): Promise<void> {
  if (vectors.length === 0) {
    return
  }

  const index = await getIndex()

  for (let start = 0; start < vectors.length; start += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(start, start + UPSERT_BATCH_SIZE)
    await index.upsert({
      records: batch.map((vector) => ({
        id: vector.chunkId,
        values: vector.values,
        metadata: {
          workspaceId: vector.workspaceId,
          sourceId: vector.sourceId,
          chunkId: vector.chunkId,
          sourceType: vector.sourceType,
          chunkIndex: vector.chunkIndex,
          sourceTitle: vector.sourceTitle,
          originalPosition: vector.originalPosition,
        },
      })),
    })
  }
}

async function queryWorkspace(
  workspaceId: string,
  vector: number[],
  topK: number,
): Promise<VectorMatch[]> {
  const index = await getIndex()
  const response = await index.query({
    vector,
    topK,
    filter: { workspaceId: { $eq: workspaceId } },
    includeMetadata: true,
  })

  const matches: VectorMatch[] = []
  for (const match of response.matches) {
    const metadata = toChunkMetadata(match.metadata)
    if (metadata && metadata.workspaceId === workspaceId) {
      matches.push({ metadata, score: match.score ?? 0 })
    }
  }

  return matches
}

async function deleteBySource(sourceId: string): Promise<void> {
  if (!isPineconeConfigured()) {
    return
  }

  try {
    const index = await getIndex()
    await index.deleteMany({ filter: { sourceId: { $eq: sourceId } } })
  } catch (error) {
    logger.warn({ err: error, sourceId }, 'Failed to delete source vectors from Pinecone')
  }
}

async function deleteByWorkspace(workspaceId: string): Promise<void> {
  if (!isPineconeConfigured()) {
    return
  }

  try {
    const index = await getIndex()
    await index.deleteMany({ filter: { workspaceId: { $eq: workspaceId } } })
  } catch (error) {
    logger.warn({ err: error, workspaceId }, 'Failed to delete workspace vectors from Pinecone')
  }
}

export const pineconeService = {
  isPineconeConfigured,
  upsertChunks,
  queryWorkspace,
  deleteBySource,
  deleteByWorkspace,
}
