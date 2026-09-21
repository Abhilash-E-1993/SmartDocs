import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'
import { withRetry } from '../utils/retry'

interface YoutubeTranscriptResult {
  videoId: string
  text: string
}

const VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?[^#]*v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/live\/)([\w-]{11})/,
  /(?:youtube\.com\/v\/)([\w-]{11})/,
]

function extractVideoId(url: string): string | null {
  const trimmed = url.trim()

  try {
    const parsed = new URL(trimmed)
    const v = parsed.searchParams.get('v')

    if (v && /^[\w-]{11}$/.test(v)) {
      return v
    }
  } catch {
    // Ignore URL parse error and fall back to regexes.
  }

  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = pattern.exec(trimmed)

    if (match) {
      return match[1]
    }
  }

  return null
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

const SUPADATA_BASE_URL = 'https://api.supadata.ai/v1/youtube/transcript'

/**
 * Errors that are worth retrying (transient) vs. not (permanent, e.g. bad
 * key, no captions). Keeps the Inngest job from hammering a request that
 * will never succeed, while still recovering from blips.
 */
function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function fetchFromSupadata(videoId: string): Promise<string> {
  if (!env.SUPADATA_API_KEY) {
    throw ApiError.internal('SUPADATA_API_KEY is not configured')
  }

  const url = `${SUPADATA_BASE_URL}?videoId=${encodeURIComponent(videoId)}&text=true`

  const response = await fetch(url, {
    headers: { 'x-api-key': env.SUPADATA_API_KEY },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const message = `Supadata request failed with HTTP ${response.status}: ${body.slice(0, 300)}`

    if (isRetriableStatus(response.status)) {
      throw new Error(message)
    }

    // Non-retriable: bad API key (401), no credits (402), video/captions not
    // found (404), bad params (400). Fail immediately, don't retry.
    const error = new Error(message) as Error & { retriable?: boolean }
    error.retriable = false
    throw error
  }

  const data = (await response.json()) as { content?: string; error?: string }

  if (!data.content) {
    const error = new Error(data.error ?? 'Supadata returned no transcript content') as Error & {
      retriable?: boolean
    }
    error.retriable = false
    throw error
  }

  return decodeEntities(data.content).replace(/\s+/g, ' ').trim()
}

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  logger.info({ videoId }, 'Fetching YouTube transcript via Supadata')

  try {
    const text = await withRetry(() => fetchFromSupadata(videoId), {
      attempts: 3,
      label: 'youtube-supadata',
    })

    logger.info({ videoId, textLength: text.length }, 'YouTube transcript fetched successfully')

    return { videoId, text }
  } catch (error) {
    logger.error(
      { videoId, error: error instanceof Error ? error.message : String(error) },
      'Supadata transcript fetch failed',
    )
    throw error
  }
}

export const youtubeService = { extractVideoId, getTranscript }