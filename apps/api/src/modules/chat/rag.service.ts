import { logger } from '../../config/logger'
import { mem0Service } from '../../services/mem0.service'
import {
  openaiService,
  type ChatHistoryMessage,
  type TransformedQuery,
} from '../../services/openai.service'
import { pineconeService, type VectorMatch } from '../../services/pinecone.service'
import { SourceModel, type SourceDocument } from '../sources/Source'
import { SourceChunkModel, type SourceChunkDocument } from '../sources/SourceChunk'
import type { ChatDocument } from './Chat'
import { DEFAULT_CHAT_TITLE } from './Chat'
import { mapWithConcurrency } from '../../utils/async-pool'
import {
  buildContextBlock,
  buildSourceCatalog,
  buildSummarySystemPrompt,
  buildSystemPrompt,
  prepareContextChunks,
  type RetrievedChunk,
  type SourceCatalogEntry,
} from './context-builder'
import type { IMessageCitation, MessageDocument } from './Message'
import { chatService } from './service'
import { toMessageResponse, type ChatStreamEvent } from './types'

const VERIFICATION_THRESHOLD = 7
const MAX_ATTEMPTS = 2
const DEFAULT_TOP_K = 8
const PER_SOURCE_TOP_K = 4
const MAX_TOP_K = 24
const CITATION_CONTENT_LIMIT = 2000
const RRF_K = 60
const RERANK_CANDIDATES = 12
const RERANK_CANDIDATE_POOL = 24
const MAX_CANDIDATES_PER_SOURCE = 4
const RERANK_MIN_SCORE = 4
const MIN_KEPT_AFTER_RERANK = 2
const DIVERSITY_MIN_SOURCES = 2
const FINAL_CHUNKS = 6
const MAX_CONTEXT_CHUNKS = 9
const NEIGHBOR_WINDOW = 1
const SUMMARY_MATCH_TOP_K = 10
const MAX_SUMMARY_SOURCES = 4
const MULTI_SOURCE_SCORE_RATIO = 0.55
const MAX_SUMMARY_CHARS = 150_000
const TOPIC_BACKFILL_LIMIT = 5
const TOPIC_BACKFILL_CONCURRENCY = 3
const STREAM_STEP_CHARS = 24
const STREAM_STEP_DELAY_MS = 12

interface AnswerQuestionParams {
  chat: ChatDocument
  ownerId: string
  question: string
  topK?: number
  emit: (event: ChatStreamEvent) => void
  signal: AbortSignal
}

interface AttemptResult {
  answer: string
  citations: IMessageCitation[]
  score: number | undefined
}

/* --------------------------------------------------------------------------
 * Source catalog — every READY source with its topic. Sources indexed before
 * topic labeling existed are backfilled lazily here (bounded per request and
 * persisted), so deployed workspaces heal themselves without a migration.
 * ------------------------------------------------------------------------ */

interface SourceCatalog {
  sources: SourceDocument[]
  entries: SourceCatalogEntry[]
}

async function getSourceCatalog(workspaceId: string): Promise<SourceCatalog> {
  const sources = await SourceModel.find({ workspaceId, status: 'READY' }).sort({
    createdAt: -1,
  })

  const missing = sources
    .filter((source) => !source.topic && Boolean(source.contentPreview))
    .slice(0, TOPIC_BACKFILL_LIMIT)

  if (missing.length > 0) {
    await mapWithConcurrency(missing, TOPIC_BACKFILL_CONCURRENCY, async (source) => {
      const result = await openaiService.generateSourceTopic(
        source.title,
        source.sourceType,
        source.contentPreview ?? '',
      )
      if (!result) {
        return
      }
      source.topic = result.topic
      source.topicSummary = result.summary
      await SourceModel.findByIdAndUpdate(source._id, {
        topic: result.topic,
        topicSummary: result.summary,
      }).catch((error: unknown) => {
        logger.warn({ err: error, sourceId: source._id.toString() }, 'Topic backfill save failed')
      })
    })
  }

  return {
    sources,
    entries: sources.map((source) => ({
      sourceId: source._id.toString(),
      title: source.title,
      sourceType: source.sourceType,
      topic: source.topic,
    })),
  }
}

/** Deeper queries for bigger corpora so every source can be reached. */
function computeTopK(sourceCount: number): number {
  return Math.min(MAX_TOP_K, Math.max(DEFAULT_TOP_K, sourceCount * PER_SOURCE_TOP_K))
}

/* --------------------------------------------------------------------------
 * Source-diverse selection — without it, top-K retrieval is dominated by the
 * single most-similar document and the chat effectively ignores the other
 * sources in the workspace.
 * ------------------------------------------------------------------------ */

/** Round-robin across sources so the rerank pool covers every relevant source. */
function pickDiverseMatches(fused: VectorMatch[], limit: number): VectorMatch[] {
  const bySource = new Map<string, VectorMatch[]>()
  for (const match of fused) {
    const list = bySource.get(match.metadata.sourceId) ?? []
    list.push(match)
    bySource.set(match.metadata.sourceId, list)
  }

  const picked: VectorMatch[] = []
  let round = 0
  while (picked.length < limit) {
    let addedThisRound = false
    for (const list of bySource.values()) {
      if (picked.length >= limit) {
        break
      }
      if (round >= MAX_CANDIDATES_PER_SOURCE) {
        continue
      }
      const match = list[round]
      if (match) {
        picked.push(match)
        addedThisRound = true
      }
    }
    if (!addedThisRound) {
      break
    }
    round += 1
  }

  return picked
}

/**
 * Guarantees the final context represents several sources: the best chunk of
 * each qualifying source is protected, the remaining slots go to the highest
 * scores. Falls back to the plain top-N when few sources qualify.
 */
function selectDiverseChunks(ranked: RetrievedChunk[], limit: number): RetrievedChunk[] {
  if (ranked.length <= limit) {
    return ranked
  }

  const bestBySource = new Map<string, RetrievedChunk>()
  for (const chunk of ranked) {
    const current = bestBySource.get(chunk.sourceId)
    if (!current || chunk.score > current.score) {
      bestBySource.set(chunk.sourceId, chunk)
    }
  }

  const protectedChunks = [...bestBySource.values()]
    .filter((chunk) => chunk.score >= RERANK_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  if (protectedChunks.length < Math.min(DIVERSITY_MIN_SOURCES, bestBySource.size)) {
    return ranked.slice(0, limit)
  }

  const protectedIds = new Set(protectedChunks.map((chunk) => chunk.chunkId))
  const rest = ranked.filter((chunk) => !protectedIds.has(chunk.chunkId))
  return [...protectedChunks, ...rest.slice(0, limit - protectedChunks.length)]
}

/* --------------------------------------------------------------------------
 * Retrieval — multi-query search (standalone + step-back + HyDE + sub-queries)
 * fused with Reciprocal Rank Fusion, then LLM re-ranked.
 * ------------------------------------------------------------------------ */

function rrfFuse(resultLists: VectorMatch[][]): VectorMatch[] {
  const fused = new Map<string, { match: VectorMatch; score: number }>()

  for (const list of resultLists) {
    list.forEach((match, rank) => {
      const id = match.metadata.chunkId
      const entry = fused.get(id) ?? { match, score: 0 }
      entry.score += 1 / (RRF_K + rank + 1)
      if (match.score > entry.match.score) {
        entry.match = match
      }
      fused.set(id, entry)
    })
  }

  return [...fused.values()].sort((a, b) => b.score - a.score).map((entry) => entry.match)
}

async function hydrateChunks(matches: VectorMatch[]): Promise<RetrievedChunk[]> {
  if (matches.length === 0) {
    return []
  }

  const docs = await SourceChunkModel.find({
    _id: { $in: matches.map((match) => match.metadata.chunkId) },
  })
  const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]))

  const chunks: RetrievedChunk[] = []
  for (const match of matches) {
    const doc = byId.get(match.metadata.chunkId)
    if (!doc) {
      continue
    }

    chunks.push({
      chunkId: match.metadata.chunkId,
      sourceId: match.metadata.sourceId,
      sourceTitle: match.metadata.sourceTitle,
      sourceType: doc.sourceType,
      chunkIndex: doc.chunkIndex,
      originalPosition: doc.startOffset,
      content: doc.content,
      contextSummary: doc.contextSummary,
      score: match.score,
    })
  }

  return chunks
}

// Pull the chunks immediately before/after each winning chunk so the answer
// can use the surrounding text (crucial for punctuation-less transcripts).
async function expandWithNeighbors(chunks: RetrievedChunk[]): Promise<RetrievedChunk[]> {
  if (chunks.length === 0) {
    return chunks
  }

  const docs = await SourceChunkModel.find({
    $or: chunks.map((chunk) => ({
      sourceId: chunk.sourceId,
      chunkIndex: {
        $gte: chunk.chunkIndex - NEIGHBOR_WINDOW,
        $lte: chunk.chunkIndex + NEIGHBOR_WINDOW,
      },
    })),
  })
  const bySourceAndIndex = new Map(
    docs.map((doc) => [`${doc.sourceId.toString()}:${doc.chunkIndex}`, doc]),
  )

  const merged = new Map<string, RetrievedChunk>()
  for (const chunk of chunks) {
    merged.set(chunk.chunkId, chunk)
  }

  for (const chunk of chunks) {
    for (
      let index = chunk.chunkIndex - NEIGHBOR_WINDOW;
      index <= chunk.chunkIndex + NEIGHBOR_WINDOW;
      index += 1
    ) {
      const doc = bySourceAndIndex.get(`${chunk.sourceId}:${index}`)
      if (!doc) {
        continue
      }
      const id = doc._id.toString()
      if (merged.has(id)) {
        continue
      }
      merged.set(id, {
        chunkId: id,
        sourceId: chunk.sourceId,
        sourceTitle: chunk.sourceTitle,
        sourceType: doc.sourceType,
        chunkIndex: doc.chunkIndex,
        originalPosition: doc.startOffset,
        content: doc.content,
        contextSummary: doc.contextSummary,
        score: chunk.score - 0.5,
      })
    }
  }

  return [...merged.values()]
}

function toCitations(chunks: RetrievedChunk[]): IMessageCitation[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    sourceType: chunk.sourceType,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content.slice(0, CITATION_CONTENT_LIMIT),
    score: chunk.score,
  }))
}

/* --------------------------------------------------------------------------
 * Summary path — pick the intended source and read it in full instead of
 * retrieving a handful of chunks (which is what made summaries shallow).
 * ------------------------------------------------------------------------ */

async function pickSummarySources(workspaceId: string, query: string): Promise<SourceDocument[]> {
  const readySources = await SourceModel.find({ workspaceId, status: 'READY' }).sort({
    createdAt: -1,
  })
  if (readySources.length <= 1) {
    return readySources
  }

  try {
    const embedding = await openaiService.generateEmbedding(query)
    const matches = await pineconeService.queryWorkspace(
      workspaceId,
      embedding,
      SUMMARY_MATCH_TOP_K,
    )

    // Tally retrieval scores per source. Every source close to the winner is
    // a target too — "summarize my sources" over several documents must cover
    // all of them, not just the dominant one.
    const tally = new Map<string, number>()
    for (const match of matches) {
      tally.set(match.metadata.sourceId, (tally.get(match.metadata.sourceId) ?? 0) + match.score)
    }

    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1])
    const bestScore = ranked[0]?.[1] ?? 0

    const pickedIds = ranked
      .filter(([, score]) => score >= bestScore * MULTI_SOURCE_SCORE_RATIO)
      .slice(0, MAX_SUMMARY_SOURCES)
      .map(([sourceId]) => sourceId)

    const picked = pickedIds
      .map((sourceId) => readySources.find((source) => source._id.toString() === sourceId))
      .filter((source): source is SourceDocument => Boolean(source))

    if (picked.length > 0) {
      return picked
    }
  } catch (error) {
    logger.warn({ err: error }, 'Summary source detection failed, using the most recent source')
  }

  return [readySources[0]]
}

async function loadSummaryChunks(
  sourceIds: string[],
): Promise<{ chunks: SourceChunkDocument[]; sampled: boolean }> {
  const chunks = await SourceChunkModel.find({ sourceId: { $in: sourceIds } }).sort({
    sourceId: 1,
    chunkIndex: 1,
  })
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)
  if (totalChars <= MAX_SUMMARY_CHARS) {
    return { chunks, sampled: false }
  }

  // Very long source: keep even coverage by sampling chunks across the whole
  // document instead of truncating the tail.
  const targetCount = Math.max(1, Math.floor((chunks.length * MAX_SUMMARY_CHARS) / totalChars))
  const sampledChunks: SourceChunkDocument[] = []
  for (let index = 0; index < targetCount; index += 1) {
    sampledChunks.push(chunks[Math.floor((index * chunks.length) / targetCount)])
  }

  return { chunks: sampledChunks, sampled: true }
}

function buildSummaryContext(
  sources: SourceDocument[],
  chunks: SourceChunkDocument[],
  sampled: boolean,
): string {
  return sources
    .map((source) => {
      const own = chunks.filter((chunk) => chunk.sourceId.toString() === source._id.toString())
      const note = sampled ? ' (evenly sampled because the source is very long)' : ''
      const body = own.map((chunk) => chunk.content).join('\n')
      return `=== Source: "${source.title}" (${source.sourceType})${note} ===\n${body}`
    })
    .join('\n\n')
}

function summaryCitations(
  sources: SourceDocument[],
  chunks: SourceChunkDocument[],
): IMessageCitation[] {
  const citations: IMessageCitation[] = []

  for (const source of sources) {
    const own = chunks.filter((chunk) => chunk.sourceId.toString() === source._id.toString())
    if (own.length === 0) {
      continue
    }

    // Representative chunks: beginning, middle and end of the source.
    const representative = [own[0], own[Math.floor(own.length / 2)], own[own.length - 1]]
    const seen = new Set<string>()
    for (const chunk of representative) {
      const id = chunk._id.toString()
      if (seen.has(id)) {
        continue
      }
      seen.add(id)
      citations.push({
        chunkId: id,
        sourceId: source._id.toString(),
        sourceTitle: source.title,
        sourceType: source.sourceType,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content.slice(0, CITATION_CONTENT_LIMIT),
        score: 1,
      })
    }
  }

  return citations
}

/* --------------------------------------------------------------------------
 * Shared attempt machinery — generate buffered, verify, retry once with
 * feedback, and only then stream the winning answer to the client.
 * ------------------------------------------------------------------------ */

function isBetterAttempt(candidate: AttemptResult, current: AttemptResult | null): boolean {
  if (!current) {
    return true
  }

  return (candidate.score ?? VERIFICATION_THRESHOLD) > (current.score ?? VERIFICATION_THRESHOLD)
}

async function generateBufferedAnswer(
  system: string,
  history: ChatHistoryMessage[],
  question: string,
  signal: AbortSignal,
): Promise<string> {
  const answer = await openaiService.generateAnswer({
    system,
    messages: [...history, { role: 'user', content: question }],
    signal,
  })
  if (!answer) {
    throw new Error('The model returned an empty answer')
  }

  return answer
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function streamFinalAnswer(
  answer: string,
  emit: (event: ChatStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  for (let index = 0; index < answer.length; index += STREAM_STEP_CHARS) {
    if (signal.aborted) {
      return
    }
    emit({ type: 'token', content: answer.slice(index, index + STREAM_STEP_CHARS) })
    await sleep(STREAM_STEP_DELAY_MS)
  }
}

async function retrieveContextChunks(
  workspaceId: string,
  question: string,
  variants: string[],
  topK: number,
  emit: (event: ChatStreamEvent) => void,
  attempt: number,
): Promise<RetrievedChunk[]> {
  emit({ type: 'status', stage: 'searching', attempt })

  // All query variants are embedded in one batch and searched in parallel.
  const embeddings = await openaiService.generateEmbeddings(variants)
  const resultLists = await Promise.all(
    embeddings.map((vector) => pineconeService.queryWorkspace(workspaceId, vector, topK)),
  )
  const fused = rrfFuse(resultLists)
  // Take a wide pool, then pick candidates round-robin per source so the
  // reranker sees every relevant source instead of only the dominant one.
  const diverseMatches = pickDiverseMatches(fused.slice(0, RERANK_CANDIDATE_POOL), RERANK_CANDIDATES)
  const candidates = await hydrateChunks(diverseMatches)
  if (candidates.length === 0) {
    return []
  }

  // LLM re-ranking picks the passages that truly answer the question.
  emit({ type: 'status', stage: 'ranking', attempt })
  const rerankScores = await openaiService.rerankChunks(
    question,
    candidates.map((candidate) => ({ id: candidate.chunkId, text: candidate.content })),
  )

  let ranked = candidates
  if (rerankScores.size > 0) {
    ranked = candidates
      .map((candidate) => ({ ...candidate, score: rerankScores.get(candidate.chunkId) ?? 0 }))
      .sort((a, b) => b.score - a.score)
    const strong = ranked.filter((candidate) => candidate.score >= RERANK_MIN_SCORE)
    ranked =
      strong.length >= MIN_KEPT_AFTER_RERANK ? strong : ranked.slice(0, MIN_KEPT_AFTER_RERANK)
  }

  // Guarantee coverage across sources before expanding with neighbors.
  const selected = selectDiverseChunks(ranked, FINAL_CHUNKS)
  const expanded = await expandWithNeighbors(selected)
  return prepareContextChunks(expanded).slice(0, MAX_CONTEXT_CHUNKS)
}

async function runQuestionAttemptLoop(
  params: AnswerQuestionParams,
  transformed: TransformedQuery,
  history: ChatHistoryMessage[],
  memories: string[],
  catalog: SourceCatalogEntry[],
): Promise<AttemptResult> {
  const { chat, question, emit, signal } = params
  const workspaceId = chat.workspaceId.toString()
  const topK = params.topK ?? computeTopK(catalog.length)
  const catalogBlock = buildSourceCatalog(catalog)

  let best: AttemptResult | null = null
  let feedback: string | undefined
  let working = transformed

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      // Replan the search with the verifier's criticism.
      working = await openaiService.transformQuery(question, history, feedback)
    }

    const variants =
      working.variants.length > 0 ? working.variants : [working.standalone || question]
    const chunks = await retrieveContextChunks(workspaceId, question, variants, topK, emit, attempt)
    const context = buildContextBlock(chunks)

    emit({ type: 'status', stage: 'generating', attempt })
    const system = buildSystemPrompt(context, memories, feedback, catalogBlock)
    const answer = await generateBufferedAnswer(system, history, question, signal)

    let score: number | undefined
    if (chunks.length > 0) {
      emit({ type: 'status', stage: 'verifying', attempt })
      try {
        const verification = await openaiService.verifyAnswer(question, answer, context, 'question')
        score = verification.score

        if (score < VERIFICATION_THRESHOLD && attempt < MAX_ATTEMPTS) {
          logger.info(
            { chatId: chat._id.toString(), attempt, score },
            'Answer below verification threshold, retrying with a new query plan',
          )
          emit({ type: 'status', stage: 'retrying', attempt: attempt + 1 })
          feedback = verification.reason
        }
      } catch (error) {
        logger.warn({ err: error }, 'Answer verification failed, accepting current answer')
      }
    }

    const result: AttemptResult = { answer, citations: toCitations(chunks), score }
    if (isBetterAttempt(result, best)) {
      best = result
    }

    if (score === undefined || score >= VERIFICATION_THRESHOLD) {
      break
    }
  }

  return (
    best ?? {
      answer: 'I was unable to generate an answer. Please try again.',
      citations: [],
      score: undefined,
    }
  )
}

async function runSummaryAttemptLoop(
  params: AnswerQuestionParams,
  searchQuery: string,
  history: ChatHistoryMessage[],
  memories: string[],
  catalog: SourceCatalog,
): Promise<AttemptResult> {
  const { chat, question, emit, signal } = params
  const workspaceId = chat.workspaceId.toString()

  emit({ type: 'status', stage: 'searching', attempt: 1 })
  const sources =
    catalog.sources.length > 0 ? await pickSummarySources(workspaceId, searchQuery) : []
  if (sources.length === 0) {
    return {
      answer:
        'There are no ready sources in this workspace to summarize yet. Add a source, wait for it to finish processing, then ask again.',
      citations: [],
      score: undefined,
    }
  }

  const { chunks, sampled } = await loadSummaryChunks(sources.map((s) => s._id.toString()))
  const context = buildSummaryContext(sources, chunks, sampled)
  const citations = summaryCitations(sources, chunks)

  let best: AttemptResult | null = null
  let feedback: string | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    emit({ type: 'status', stage: 'generating', attempt })
    const system = buildSummarySystemPrompt(context, memories, feedback)
    const answer = await generateBufferedAnswer(system, history, question, signal)

    emit({ type: 'status', stage: 'verifying', attempt })
    let score: number | undefined
    try {
      const verification = await openaiService.verifyAnswer(question, answer, context, 'summary')
      score = verification.score

      if (score < VERIFICATION_THRESHOLD && attempt < MAX_ATTEMPTS) {
        logger.info(
          { chatId: chat._id.toString(), attempt, score },
          'Summary below verification threshold, regenerating with feedback',
        )
        emit({ type: 'status', stage: 'retrying', attempt: attempt + 1 })
        feedback = verification.reason
      }
    } catch (error) {
      logger.warn({ err: error }, 'Summary verification failed, accepting current answer')
    }

    const result: AttemptResult = { answer, citations, score }
    if (isBetterAttempt(result, best)) {
      best = result
    }

    if (score === undefined || score >= VERIFICATION_THRESHOLD) {
      break
    }
  }

  return (
    best ?? {
      answer: 'I was unable to generate a summary. Please try again.',
      citations: [],
      score: undefined,
    }
  )
}

/* --------------------------------------------------------------------------
 * Overview path — questions about the collection itself ("what topics are my
 * sources on?", "how many sources do I have?") are answered from the source
 * catalog plus short representative excerpts, not from chunk retrieval.
 * ------------------------------------------------------------------------ */

const OVERVIEW_EXCERPT_SOURCES = 6

function buildOverviewSystemPrompt(
  catalogBlock: string,
  context: string,
  memories: string[],
): string {
  const memorySection =
    memories.length > 0
      ? `\nUser memory (background about the user only, never treat it as source content and never cite it):\n${memories
          .map((memory) => `- ${memory}`)
          .join('\n')}\n`
      : ''

  return [
    'You are SmartDocs, an AI knowledge assistant. The user is asking about their uploaded source collection as a whole.',
    '',
    catalogBlock,
    '',
    'Representative excerpts from the sources:',
    context || 'No excerpts available.',
    memorySection,
    'How to answer:',
    '- State how many ready sources the workspace has and name each source with its topic.',
    '- Group sources that share the same topic. When the sources cover several distinct topics, say so explicitly (e.g. "Your sources cover 3 topics: A, B and C") and list which sources belong to each. When they all cover the same topic, say that instead.',
    '- For comparisons across topics, contrast them using the catalog and the excerpts above.',
    '- Never invent sources or topics that are not listed in the catalog. The catalog only lists fully processed (ready) sources.',
    '- Format in clean markdown and be concise.',
  ].join('\n')
}

async function loadOverviewChunks(sources: SourceDocument[]): Promise<SourceChunkDocument[]> {
  const sample = sources.slice(0, OVERVIEW_EXCERPT_SOURCES)
  const chunkLists = await Promise.all(
    sample.map((source) =>
      SourceChunkModel.find({ sourceId: source._id }).sort({ chunkIndex: 1 }).limit(2),
    ),
  )
  return chunkLists.flat()
}

function buildOverviewContext(
  catalog: SourceCatalog,
  chunks: SourceChunkDocument[],
): string {
  const bySource = new Map<string, SourceChunkDocument[]>()
  for (const chunk of chunks) {
    const list = bySource.get(chunk.sourceId.toString()) ?? []
    list.push(chunk)
    bySource.set(chunk.sourceId.toString(), list)
  }

  return catalog.sources
    .map((source, index) => {
      const head =
        `[S${index + 1}] "${source.title}" (${source.sourceType})` +
        (source.topic ? `\nTopic: ${source.topic}` : '') +
        (source.topicSummary ? `\nAbout: ${source.topicSummary}` : '')
      const excerpt = (bySource.get(source._id.toString()) ?? [])
        .map((chunk) => chunk.content)
        .join('\n')
      return excerpt ? `${head}\nExcerpt:\n${excerpt}` : head
    })
    .join('\n\n')
}

function overviewCitations(
  catalog: SourceCatalog,
  chunks: SourceChunkDocument[],
): IMessageCitation[] {
  return chunks.map((chunk) => {
    const source = catalog.sources.find(
      (candidate) => candidate._id.toString() === chunk.sourceId.toString(),
    )
    return {
      chunkId: chunk._id.toString(),
      sourceId: chunk.sourceId.toString(),
      sourceTitle: source?.title ?? 'Source',
      sourceType: chunk.sourceType,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content.slice(0, CITATION_CONTENT_LIMIT),
      score: 1,
    }
  })
}

async function runOverviewPath(
  params: AnswerQuestionParams,
  history: ChatHistoryMessage[],
  memories: string[],
  catalog: SourceCatalog,
): Promise<AttemptResult> {
  const { question, emit, signal } = params

  if (catalog.sources.length === 0) {
    return {
      answer:
        'There are no ready sources in this workspace yet. Add a source, wait for it to finish processing, then ask again.',
      citations: [],
      score: undefined,
    }
  }

  emit({ type: 'status', stage: 'searching', attempt: 1 })
  const chunks = await loadOverviewChunks(catalog.sources)
  const context = buildOverviewContext(catalog, chunks)
  const citations = overviewCitations(catalog, chunks)

  emit({ type: 'status', stage: 'generating', attempt: 1 })
  const system = buildOverviewSystemPrompt(buildSourceCatalog(catalog.entries), context, memories)
  const answer = await generateBufferedAnswer(system, history, question, signal)

  return { answer, citations, score: undefined }
}

/* --------------------------------------------------------------------------
 * Entry point
 * ------------------------------------------------------------------------ */

async function answerQuestion(params: AnswerQuestionParams): Promise<MessageDocument> {
  const { chat, ownerId, question, emit, signal } = params
  const chatId = chat._id.toString()
  const workspaceId = chat.workspaceId.toString()

  const userMessage = await chatService.appendMessage({
    chatId,
    workspaceId,
    ownerId,
    role: 'user',
    content: question,
  })

  let chatTitle = chat.title
  let titleGenerated = false
  if (chat.messageCount === 0 && chat.title === DEFAULT_CHAT_TITLE) {
    chatTitle = await openaiService.generateChatTitle(question)
    await chatService.setAutoTitle(chatId, chatTitle)
    titleGenerated = true
  }

  emit({
    type: 'meta',
    chatId,
    chatTitle,
    titleGenerated,
    userMessageId: userMessage._id.toString(),
  })

  const historyDocs = await chatService.getRecentHistory(chatId)
  const history: ChatHistoryMessage[] = historyDocs
    .filter((doc) => doc._id.toString() !== userMessage._id.toString())
    .map((doc) => ({ role: doc.role, content: doc.content }))

  emit({ type: 'status', stage: 'rewriting', attempt: 1 })
  const [transformed, memories, catalog] = await Promise.all([
    openaiService.transformQuery(question, history),
    mem0Service.searchMemories(ownerId, question),
    getSourceCatalog(workspaceId),
  ])

  const result =
    transformed.intent === 'overview'
      ? await runOverviewPath(params, history, memories, catalog)
      : transformed.intent === 'summary'
        ? await runSummaryAttemptLoop(params, transformed.standalone, history, memories, catalog)
        : await runQuestionAttemptLoop(params, transformed, history, memories, catalog.entries)

  // The answer is only streamed after verification has passed (or the best
  // attempt was chosen) — the client never sees an unverified draft.
  await streamFinalAnswer(result.answer, emit, signal)

  const assistantMessage = await chatService.appendMessage({
    chatId,
    workspaceId,
    ownerId,
    role: 'assistant',
    content: result.answer,
    citations: result.citations,
    verificationScore: result.score,
    memories,
  })

  await mem0Service.addConversation(ownerId, [
    { role: 'user', content: question },
    { role: 'assistant', content: result.answer },
  ])

  emit({ type: 'final', message: toMessageResponse(assistantMessage) })
  return assistantMessage
}

export const ragService = { answerQuestion }
