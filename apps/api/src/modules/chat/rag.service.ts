import { logger } from '../../config/logger'
import { mem0Service } from '../../services/mem0.service'
import { openaiService, type ChatHistoryMessage } from '../../services/openai.service'
import { pineconeService, type VectorMatch } from '../../services/pinecone.service'
import { SourceChunkModel } from '../sources/SourceChunk'
import type { ChatDocument } from './Chat'
import { DEFAULT_CHAT_TITLE } from './Chat'
import {
  buildContextBlock,
  buildSystemPrompt,
  prepareContextChunks,
  type RetrievedChunk,
} from './context-builder'
import type { IMessageCitation, MessageDocument } from './Message'
import { chatService } from './service'
import { toMessageResponse, type ChatStreamEvent } from './types'

const VERIFICATION_THRESHOLD = 8
const MAX_ATTEMPTS = 3
const DEFAULT_TOP_K = 5
const CITATION_CONTENT_LIMIT = 2000

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
  chunks: RetrievedChunk[]
  score: number | undefined
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
      score: match.score,
    })
  }

  return chunks
}

async function generateAnswer(
  system: string,
  history: ChatHistoryMessage[],
  question: string,
  emit: (event: ChatStreamEvent) => void,
  signal: AbortSignal,
): Promise<string> {
  let answer = ''
  const stream = openaiService.streamAnswer({
    system,
    messages: [...history, { role: 'user', content: question }],
    signal,
  })

  for await (const token of stream) {
    answer += token
    emit({ type: 'token', content: token })
  }

  return answer
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

function isBetterAttempt(candidate: AttemptResult, current: AttemptResult | null): boolean {
  if (!current) {
    return true
  }

  return (candidate.score ?? VERIFICATION_THRESHOLD) > (current.score ?? VERIFICATION_THRESHOLD)
}

async function runAttemptLoop(
  params: AnswerQuestionParams,
  searchQuery: string,
  history: ChatHistoryMessage[],
  memories: string[],
): Promise<AttemptResult> {
  const { chat, question, emit, signal } = params
  const workspaceId = chat.workspaceId.toString()
  const topK = params.topK ?? DEFAULT_TOP_K

  let best: AttemptResult | null = null
  let query = searchQuery

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    emit({ type: 'status', stage: 'searching', attempt })
    const embedding = await openaiService.generateEmbedding(query)
    const matches = await pineconeService.queryWorkspace(workspaceId, embedding, topK)
    const chunks = prepareContextChunks(await hydrateChunks(matches))
    const context = buildContextBlock(chunks)

    emit({ type: 'status', stage: 'generating', attempt })
    const system = buildSystemPrompt(context, memories)
    const answer = await generateAnswer(system, history, question, emit, signal)

    let score: number | undefined
    if (chunks.length > 0) {
      emit({ type: 'status', stage: 'verifying', attempt })
      try {
        const verification = await openaiService.verifyAnswer(question, answer, context)
        score = verification.score

        if (score < VERIFICATION_THRESHOLD && attempt < MAX_ATTEMPTS) {
          logger.info(
            { chatId: chat._id.toString(), attempt, score },
            'Answer below verification threshold, retrying retrieval',
          )
          emit({ type: 'status', stage: 'retrying', attempt: attempt + 1 })
          query = await openaiService.rewriteQueryWithFeedback(question, query, verification.reason)
        }
      } catch (error) {
        logger.warn({ err: error }, 'Answer verification failed, accepting current answer')
      }
    }

    const result: AttemptResult = { answer, chunks, score }
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
      chunks: [],
      score: undefined,
    }
  )
}

async function answerQuestion(params: AnswerQuestionParams): Promise<MessageDocument> {
  const { chat, ownerId, question, emit } = params
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
  const [rewrittenQuery, memories] = await Promise.all([
    openaiService.rewriteQuery(question, history),
    mem0Service.searchMemories(ownerId, question),
  ])

  const result = await runAttemptLoop(params, rewrittenQuery, history, memories)

  const assistantMessage = await chatService.appendMessage({
    chatId,
    workspaceId,
    ownerId,
    role: 'assistant',
    content: result.answer,
    citations: toCitations(result.chunks),
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
