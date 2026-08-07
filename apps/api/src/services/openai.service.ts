import OpenAI from 'openai'

import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

const SMALL_MODEL = 'gpt-4o-mini'
const EMBEDDING_BATCH_SIZE = 64

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface VerificationResult {
  score: number
  reason: string
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

async function rewriteQuery(question: string, history: ChatHistoryMessage[]): Promise<string> {
  const openai = getClient()
  const recentHistory = history.slice(-6)

  try {
    const completion = await openai.chat.completions.create({
      model: SMALL_MODEL,
      temperature: 0,
      max_completion_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'You rewrite user questions into optimized semantic search queries. ' +
            'Preserve the exact meaning and intent of the question. ' +
            'Resolve pronouns and references using the conversation history so the query stands alone. ' +
            'Return only the rewritten query with no explanation.',
        },
        ...recentHistory,
        { role: 'user', content: question },
      ],
    })

    const rewritten = completion.choices[0]?.message.content?.trim()
    return rewritten && rewritten.length > 0 ? rewritten : question
  } catch (error) {
    logger.warn({ err: error }, 'Query rewriting failed, using the original question')
    return question
  }
}

async function rewriteQueryWithFeedback(
  question: string,
  previousQuery: string,
  feedback: string,
): Promise<string> {
  const openai = getClient()

  try {
    const completion = await openai.chat.completions.create({
      model: SMALL_MODEL,
      temperature: 0,
      max_completion_tokens: 120,
      messages: [
        {
          role: 'system',
          content:
            'You improve semantic search queries after a weak answer was produced. ' +
            'Preserve the exact meaning and intent of the original question. ' +
            'Use the feedback to target missing information. ' +
            'Return only the improved query with no explanation.',
        },
        {
          role: 'user',
          content: `Original question: ${question}\nPrevious search query: ${previousQuery}\nFeedback: ${feedback}`,
        },
      ],
    })

    const rewritten = completion.choices[0]?.message.content?.trim()
    return rewritten && rewritten.length > 0 ? rewritten : previousQuery
  } catch (error) {
    logger.warn({ err: error }, 'Query rewriting with feedback failed, keeping previous query')
    return previousQuery
  }
}

interface StreamAnswerParams {
  system: string
  messages: ChatHistoryMessage[]
  signal?: AbortSignal
}

async function* streamAnswer(params: StreamAnswerParams): AsyncGenerator<string> {
  const openai = getClient()
  const stream = await openai.chat.completions.create(
    {
      model: env.OPENAI_CHAT_MODEL,
      temperature: 0.3,
      stream: true,
      messages: [{ role: 'system', content: params.system }, ...params.messages],
    },
    { signal: params.signal },
  )

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      yield delta
    }
  }
}

async function verifyAnswer(
  question: string,
  answer: string,
  context: string,
): Promise<VerificationResult> {
  const openai = getClient()
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
          'Score the answer from 1 to 10 based on: faithfulness to the context, ' +
          'completeness for the question, and absence of unsupported claims. ' +
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
  rewriteQuery,
  rewriteQueryWithFeedback,
  streamAnswer,
  verifyAnswer,
  generateChatTitle,
}
