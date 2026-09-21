import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'

interface YoutubeTranscriptResult {
  videoId: string
  text: string
}

interface SupadataTranscriptResponse {
  lang?: string
  availableLangs?: string[]
  content?: string | Array<{
    text?: string
    offset?: number
    duration?: number
  }>
  error?: string
  message?: string
  details?: string
}

const SUPADATA_URL = 'https://api.supadata.ai/v1/transcript'

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Extract YouTube video ID from common YouTube URL formats.
 */
function extractVideoId(url: string): string | null {
  const trimmed = url.trim()

  try {
    const parsed = new URL(trimmed)

    // youtube.com/watch?v=VIDEO_ID
    if (
      parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'm.youtube.com'
    ) {
      const videoId = parsed.searchParams.get('v')

      if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return videoId
      }

      // /shorts/VIDEO_ID
      // /embed/VIDEO_ID
      // /live/VIDEO_ID
      const pathMatch = parsed.pathname.match(
        /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/,
      )

      if (pathMatch) {
        return pathMatch[1]
      }
    }

    // youtu.be/VIDEO_ID
    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.split('/')[1]

      if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return videoId
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Decode common HTML entities returned by transcript providers.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(
      /&#x([0-9A-Fa-f]+);/g,
      (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(
      /&#(\d+);/g,
      (_, dec: string) => String.fromCharCode(parseInt(dec, 10)),
    )
}

/**
 * Convert Supadata content into plain text.
 *
 * Supadata can return either a string or an array of transcript segments.
 */
function normalizeTranscript(
  content: SupadataTranscriptResponse['content'],
): string {
  if (!content) {
    return ''
  }

  if (typeof content === 'string') {
    return decodeEntities(content)
      .replace(/\s+/g, ' ')
      .trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((segment) => segment.text ?? '')
      .map((text) => decodeEntities(text))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return ''
}

/**
 * Fetch a YouTube transcript using Supadata.
 *
 * This service intentionally uses only one provider.
 * If Supadata fails, the exact provider error is surfaced.
 */
async function fetchTranscript(
  youtubeUrl: string,
): Promise<YoutubeTranscriptResult> {
  if (!env.SUPADATA_API_KEY) {
    throw new Error(
      'SUPADATA_API_KEY is missing. Add SUPADATA_API_KEY to the Render environment variables.',
    )
  }

  const videoId = extractVideoId(youtubeUrl)

  if (!videoId) {
    throw ApiError.badRequest(
      'Invalid YouTube URL. Please provide a valid YouTube video URL.',
    )
  }

  logger.info(
    {
      videoId,
    },
    'Fetching YouTube transcript from Supadata',
  )

  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const params = new URLSearchParams({
      url: youtubeUrl,
      text: 'true',
      lang: 'en',
    })

    const requestUrl = `${SUPADATA_URL}?${params.toString()}`

    const response = await fetch(requestUrl, {
      method: 'GET',

      headers: {
        'x-api-key': env.SUPADATA_API_KEY,
        Accept: 'application/json',
      },

      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') ?? ''

    const rawBody = await response.text()

    let data: SupadataTranscriptResponse = {}

    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as SupadataTranscriptResponse
      } catch {
        // Keep data empty so we can report the raw response below.
      }
    }

    if (!response.ok) {
      const providerMessage =
        data.message ||
        data.error ||
        data.details ||
        rawBody.slice(0, 500) ||
        'No response body'

      logger.error(
        {
          videoId,
          status: response.status,
          statusText: response.statusText,
          contentType,
          providerMessage,
        },
        'Supadata transcript request failed',
      )

      throw new Error(
        `Supadata transcript request failed: HTTP ${response.status} ${response.statusText}. ${providerMessage}`,
      )
    }

    const text = normalizeTranscript(data.content)

    if (!text) {
      logger.error(
        {
          videoId,
          status: response.status,
          contentType,
          availableLanguages: data.availableLangs,
          rawResponse: rawBody.slice(0, 500),
        },
        'Supadata returned a successful response but no transcript content',
      )

      throw new Error(
        `Supadata returned no transcript content for video ${videoId}. ` +
          `Available languages: ${data.availableLangs?.join(', ') || 'unknown'}`,
      )
    }

    logger.info(
      {
        videoId,
        language: data.lang,
        textLength: text.length,
      },
      'YouTube transcript fetched successfully',
    )

    return {
      videoId,
      text,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(
        {
          videoId,
          timeoutMs: REQUEST_TIMEOUT_MS,
        },
        'Supadata transcript request timed out',
      )

      throw new Error(
        `Supadata transcript request timed out after ${REQUEST_TIMEOUT_MS / 1000}s for video ${videoId}.`,
      )
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error(`Unknown Supadata error: ${String(error)}`)
  } finally {
    clearTimeout(timeout)
  }
}

export const youtubeService = {
  extractVideoId,
  fetchTranscript,
}