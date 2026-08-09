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
import {
  buildContextBlock,
  buildSummarySystemPrompt,
  buildSystemPrompt,
  prepareContextChunks,
  type RetrievedChunk,
} from './context-builder'
import type { IMessageCitation, MessageDocument } from './Message'
import { chatService } from './service'
import { toMessageResponse, type ChatStreamEvent } from './types'

const VERIFICATION_THRESHOLD = 7
const MAX_ATTEMPTS = 2
const DEFAULT_TOP_K = 8
const CITATION_CONTENT_LIMIT = 2000
const RRF_K = 60
const RERANK_CANDIDATES = 12
const RERANK_MIN_SCORE = 4
const MIN_KEPT_AFTER_RERANK = 2
const FINAL_CHUNKS = 6
const MAX_CONTEXT_CHUNKS = 9
const NEIGHBOR_WINDOW = 1
const SUMMARY_MATCH_TOP_K = 10
const MAX_SUMMARY_CHARS = 150_000
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

    // Tally retrieval scores per source — the dominant source is the target.
    const tally = new Map<string, number>()
    for (const match of matches) {
      tally.set(match.metadata.sourceId, (tally.get(match.metadata.sourceId) ?? 0) + match.score)
    }

    let bestId: string | null = null
    let bestScore = 0
    for (const [sourceId, score] of tally) {
      if (score > bestScore) {
        bestId = sourceId
        bestScore = score
      }
    }

    const found = bestId
      ? readySources.find((source) => source._id.toString() === bestId)
      : undefined
    if (found) {
      return [found]
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
  const candidates = await hydrateChunks(fused.slice(0, RERANK_CANDIDATES))
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

  const expanded = await expandWithNeighbors(ranked.slice(0, FINAL_CHUNKS))
  return prepareContextChunks(expanded).slice(0, MAX_CONTEXT_CHUNKS)
}

async function runQuestionAttemptLoop(
  params: AnswerQuestionParams,
  transformed: TransformedQuery,
  history: ChatHistoryMessage[],
  memories: string[],
): Promise<AttemptResult> {
  const { chat, question, emit, signal } = params
  const workspaceId = chat.workspaceId.toString()
  const topK = params.topK ?? DEFAULT_TOP_K

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
    const system = buildSystemPrompt(context, memories, feedback)
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
): Promise<AttemptResult> {
  const { chat, question, emit, signal } = params
  const workspaceId = chat.workspaceId.toString()

  emit({ type: 'status', stage: 'searching', attempt: 1 })
  const sources = await pickSummarySources(workspaceId, searchQuery)
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
  const [transformed, memories] = await Promise.all([
    openaiService.transformQuery(question, history),
    mem0Service.searchMemories(ownerId, question),
  ])

  const result =
    transformed.intent === 'summary'
      ? await runSummaryAttemptLoop(params, transformed.standalone, history, memories)
      : await runQuestionAttemptLoop(params, transformed, history, memories)

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
