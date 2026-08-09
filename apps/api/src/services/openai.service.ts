import OpenAI from 'openai'

import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

const SMALL_MODEL = 'gpt-4o-mini'
const EMBEDDING_BATCH_SIZE = 64
const CHUNK_CONTEXT_BATCH_SIZE = 8
const CHUNK_CONTEXT_PREVIEW_CHARS = 800
const RERANK_PREVIEW_CHARS = 700
const MAX_QUERY_VARIANTS = 5

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface VerificationResult {
  score: number
  reason: string
}

export type QueryIntent = 'summary' | 'question'

export interface TransformedQuery {
  intent: QueryIntent
  /** The question rewritten to stand alone — used for summary source detection. */
  standalone: string
  /** Every retrieval variant: standalone + step-back + HyDE passage + sub-queries. */
  variants: string[]
}

let client: OpenAI | null = null

export function isOpenAiConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY)
}

function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw ApiError.serviceUnavailable('AI features are not configured')
  }

  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }

  return client
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const openai = getClient()
  const embeddings: number[][] = []

  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBEDDING_BATCH_SIZE)
    const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: batch })
    const ordered = [...response.data].sort((a, b) => a.index - b.index)
    for (const item of ordered) {
      embeddings.push(item.embedding)
    }
  }

  return embeddings
}

async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text])
  if (!embedding) {
    throw new Error('Failed to generate an embedding for the query')
  }

  return embedding
}

/* --------------------------------------------------------------------------
 * Query planner — one small-model call producing the intent plus every
 * retrieval variant: standalone rewrite, step-back question, HyDE passage
 * and sub-queries.
 * ------------------------------------------------------------------------ */

async function transformQuery(
  question: string,
  history: ChatHistoryMessage[],
  feedback?: string,
): Promise<TransformedQuery> {
  const fallback: TransformedQuery = {
    intent: 'question',
    standalone: question,
    variants: [question],
  }
  const openai = getClient()
  const recentHistory = history.slice(-6)
  const feedbackNote = feedback
    ? ` A previous retrieval attempt was criticized for: "${feedback}" — produce different, better search variants that fix this.`
    : ''

  try {
    const completion = await openai.chat.completions.create({
      model: SMALL_MODEL,
      temperature: 0,
      max_completion_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are the query planner of a retrieval augmented assistant. ' +
            'Analyze the user message using the conversation history and return JSON only:\n' +
            '{"intent": "summary" | "question", "standalone": string, "step_back": string, "hyde": string, "sub_queries": string[]}\n' +
            '- intent "summary": the user wants a summary, overview, gist, key points or main ideas of a whole source (video, PDF, document, article), or asks what a source is about. For summaries fill only "standalone" (a query identifying the target source by topic or title) and use "" and [] for the rest.\n' +
            '- intent "question": a specific question. Fill every field:\n' +
            '  - standalone: the question rewritten to stand alone, resolving pronouns and references via the history.\n' +
            '  - step_back: a broader, more abstract version of the question that retrieves background context.\n' +
            '  - hyde: a short hypothetical passage (2-4 sentences) written as if quoted from the ideal document answering the question — declarative statements, no questions.\n' +
            '  - sub_queries: 1-3 atomic sub-questions covering the distinct aspects of the question; [] when it is already atomic.' +
            feedbackNote,
        },
        ...recentHistory,
        { role: 'user', content: question },
      ],
    })

    const raw = completion.choices[0]?.message.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      intent?: unknown
      standalone?: unknown
      step_back?: unknown
      hyde?: unknown
      sub_queries?: unknown
    }

    const intent: QueryIntent = parsed.intent === 'summary' ? 'summary' : 'question'
    const standalone =
      typeof parsed.standalone === 'string' && parsed.standalone.trim()
        ? parsed.standalone.trim()
        : question

    const variants: string[] = []
    const push = (value: unknown): void => {
      if (typeof value === 'string' && value.trim() && !variants.includes(value.trim())) {
        variants.push(value.trim())
      }
    }

    push(standalone)
    if (intent === 'question') {
      push(parsed.step_back)
      push(parsed.hyde)
      if (Array.isArray(parsed.sub_queries)) {
        parsed.sub_queries.slice(0, 2).forEach(push)
      }
    }

    return { intent, standalone, variants: variants.slice(0, MAX_QUERY_VARIANTS) }
  } catch (error) {
    logger.warn({ err: error }, 'Query transformation failed, using the original question')
    return fallback
  }
}

/* --------------------------------------------------------------------------
 * LLM re-ranking — scores fused retrieval candidates for true usefulness.
 * ------------------------------------------------------------------------ */

export interface RerankCandidate {
  id: string
  text: string
}

async function rerankChunks(
  question: string,
  candidates: RerankCandidate[],
): Promise<Map<string, number>> {
  const scores = new Map<string, number>()
  if (candidates.length === 0) {
    return scores
  }

  const openai = getClient()
  const passages = candidates.map((candidate, index) => ({
    label: `P${index + 1}`,
    id: candidate.id,
    text: candidate.text.slice(0, RERANK_PREVIEW_CHARS),
  }))

  try {
    const completion = await openai.chat.completions.create({
      model: SMALL_MODEL,
      temperature: 0,
      max_completion_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You rank passages by how useful they are for answering the question. ' +
            'Score each passage from 0 to 10: 10 = directly answers the question, ' +
            '7-9 = strong supporting information, 4-6 = loosely related, 0-3 = irrelevant. ' +
            'Judge every passage independently. ' +
            'Return JSON only: {"scores": [{"label": "P1", "score": number}, ...]} covering every passage.',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\n${passages.map((p) => `[${p.label}] ${p.text}`).join('\n\n')}`,
        },
      ],
    })

    const parsed = JSON.parse(completion.choices[0]?.message.content ?? '{}') as {
      scores?: unknown
    }
    const list = Array.isArray(parsed.scores) ? parsed.scores : []
    for (const item of list) {
      const entry = item as { label?: unknown; score?: unknown }
      const passage = passages.find((p) => p.label === entry.label)
      if (passage && typeof entry.score === 'number' && Number.isFinite(entry.score)) {
        scores.set(passage.id, Math.min(10, Math.max(0, entry.score)))
      }
    }
  } catch (error) {
    logger.warn({ err: error }, 'Chunk re-ranking failed, keeping the retrieval order')
  }

  return scores
}

/* --------------------------------------------------------------------------
 * Contextual enrichment — one situating sentence per chunk, generated at
 * index time and embedded together with the chunk (contextual retrieval).
 * ------------------------------------------------------------------------ */

async function generateChunkContexts(
  sourceTitle: string,
  sourceType: string,
  contents: string[],
): Promise<string[]> {
  if (contents.length === 0) {
    return []
  }

  const openai = getClient()
  const contexts: string[] = []

  for (let start = 0; start < contents.length; start += CHUNK_CONTEXT_BATCH_SIZE) {
    const batch = contents.slice(start, start + CHUNK_CONTEXT_BATCH_SIZE)
    try {
      const completion = await openai.chat.completions.create({
        model: SMALL_MODEL,
        temperature: 0,
        max_completion_tokens: 60 * batch.length + 50,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You situate excerpts inside their source so a search engine can find them. ' +
              'For EACH excerpt write one short sentence (max 25 words) naming the specific topic or section it belongs to within the source. ' +
              'Return JSON only: {"contexts": string[]} with exactly one entry per excerpt, in the same order.',
          },
          {
            role: 'user',
            content: `Source: "${sourceTitle}" (${sourceType})\n\n${batch
              .map(
                (content, index) =>
                  `[${index + 1}] ${content.slice(0, CHUNK_CONTEXT_PREVIEW_CHARS)}`,
              )
              .join('\n\n')}`,
          },
        ],
      })

      const parsed = JSON.parse(completion.choices[0]?.message.content ?? '{}') as {
        contexts?: unknown
      }
      const list = Array.isArray(parsed.contexts) ? parsed.contexts : []
      for (let index = 0; index < batch.length; index += 1) {
        const value = list[index]
        contexts.push(typeof value === 'string' ? value.trim().slice(0, 200) : '')
      }
    } catch (error) {
      logger.warn({ err: error, sourceTitle }, 'Chunk context batch failed, using raw chunks')
      contexts.push(...batch.map(() => ''))
    }
  }

  return contexts
}

/* --------------------------------------------------------------------------
 * Answer generation and verification
 * ------------------------------------------------------------------------ */

interface GenerateAnswerParams {
  system: string
  messages: ChatHistoryMessage[]
  signal?: AbortSignal
}

async function generateAnswer(params: GenerateAnswerParams): Promise<string> {
  const openai = getClient()
  const completion = await openai.chat.completions.create(
    {
      model: env.OPENAI_CHAT_MODEL,
      temperature: 0.3,
      messages: [{ role: 'system', content: params.system }, ...params.messages],
    },
    { signal: params.signal },
  )

  return completion.choices[0]?.message.content?.trim() ?? ''
}

export type AnswerKind = 'question' | 'summary'

async function verifyAnswer(
  question: string,
  answer: string,
  context: string,
  kind: AnswerKind = 'question',
): Promise<VerificationResult> {
  const openai = getClient()
  const criteria =
    kind === 'summary'
      ? 'coverage of the entire source from beginning to end (not just the opening), ' +
        'specificity (concrete facts, examples and numbers instead of vague statements), ' +
        'clear markdown structure, and faithfulness to the source'
      : 'faithfulness to the context, completeness for the question, and absence of unsupported claims'

  const completion = await openai.chat.completions.create({
    model: SMALL_MODEL,
    temperature: 0,
    max_completion_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You verify answers produced by a retrieval augmented assistant. ' +
          `Score the answer from 1 to 10 based on: ${criteria}. ` +
          'Respond with JSON only: {"score": number, "reason": string}. ' +
          'Keep the reason under 200 characters.',
      },
      {
        role: 'user',
        content: `Question:\n${question}\n\nContext:\n${context}\n\nAnswer:\n${answer}`,
      },
    ],
  })

  const raw = completion.choices[0]?.message.content ?? '{}'

  try {
    const parsed = JSON.parse(raw) as { score?: unknown; reason?: unknown }
    const score =
      typeof parsed.score === 'number' && Number.isFinite(parsed.score)
        ? Math.min(10, Math.max(1, Math.round(parsed.score)))
        : 1
    const reason = typeof parsed.reason === 'string' ? parsed.reason : ''
    return { score, reason }
  } catch {
    logger.warn({ raw }, 'Answer verification returned malformed JSON')
    return { score: 1, reason: 'Verification response could not be parsed' }
  }
}

async function generateChatTitle(question: string): Promise<string> {
  const openai = getClient()
  const fallback = question.length > 60 ? `${question.slice(0, 57)}...` : question

  try {
    const completion = await openai.chat.completions.create({
      model: SMALL_MODEL,
      temperature: 0.3,
      max_completion_tokens: 24,
      messages: [
        {
          role: 'system',
          content:
            'Generate a short conversation title (3 to 6 words, no quotes, no trailing punctuation) ' +
            'summarizing the user message. Return only the title.',
        },
        { role: 'user', content: question },
      ],
    })

    const title = completion.choices[0]?.message.content?.trim()
    return title && title.length > 0 ? title.slice(0, 120) : fallback
  } catch (error) {
    logger.warn({ err: error }, 'Chat title generation failed, using fallback title')
    return fallback
  }
}

export const openaiService = {
  isOpenAiConfigured,
  generateEmbeddings,
  generateEmbedding,
  transformQuery,
  rerankChunks,
  generateChunkContexts,
  generateAnswer,
  verifyAnswer,
  generateChatTitle,
}
