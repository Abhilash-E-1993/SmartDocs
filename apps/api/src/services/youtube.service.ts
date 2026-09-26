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
  content?:
    | string
    | Array<{
        text?: string
        offset?: number
        duration?: number
      }>
  error?: string
  message?: string
  details?: string
  documentationUrl?: string
}

// Supadata transcript endpoint — note the /youtube/ segment; the bare
// /v1/transcript path does not exist and returns HTTP 404.
const SUPADATA_URL = 'https://api.supadata.ai/v1/youtube/transcript'

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Extract YouTube video ID from common YouTube URL formats.
 */
function extractVideoId(url: string): string | null {
  const trimmed = url.trim()

  try {
    const parsed = new URL(trimmed)

    const hostname = parsed.hostname.toLowerCase()

    // youtube.com/watch?v=VIDEO_ID
    if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com'
    ) {
      const videoId = parsed.searchParams.get('v')

      if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return videoId
      }

      // /shorts/VIDEO_ID
      // /embed/VIDEO_ID
      // /live/VIDEO_ID
      // /v/VIDEO_ID
      const pathMatch = parsed.pathname.match(
        /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/,
      )

      if (pathMatch) {
        return pathMatch[1]
      }
    }

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
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
 * Convert Supadata transcript content into plain text.
 */
function normalizeTranscript(
  content: SupadataTranscriptResponse['content'],
): string {
  if (!content) {
    return ''
  }

  // Supadata returned plain text
  if (typeof content === 'string') {
    return decodeEntities(content)
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Supadata returned transcript segments
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
 * Fetch YouTube transcript using Supadata.
 *
 * This service intentionally uses only Supadata.
 *
 * If Supadata fails, the exact error is thrown so
 * Inngest/Render logs show the real reason.
 */
async function fetchTranscript(
  youtubeUrl: string,
): Promise<YoutubeTranscriptResult> {
  // ---------------------------------------------------------
  // 1. Check API key
  // ---------------------------------------------------------

  if (!env.SUPADATA_API_KEY) {
    throw new Error(
      'SUPADATA_API_KEY is missing. Add SUPADATA_API_KEY to the Render environment variables.',
    )
  }

  // ---------------------------------------------------------
  // 2. Validate YouTube URL
  // ---------------------------------------------------------

  const videoId = extractVideoId(youtubeUrl)

  if (!videoId) {
    throw ApiError.badRequest(
      'Invalid YouTube URL. Please provide a valid YouTube video URL.',
    )
  }

  logger.info(
    { videoId },
    'Fetching YouTube transcript from Supadata',
  )

  // ---------------------------------------------------------
  // 3. Create timeout
  // ---------------------------------------------------------

  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    // -------------------------------------------------------
    // 4. Build Supadata request
    // -------------------------------------------------------

    const params = new URLSearchParams({
      url: youtubeUrl,
      text: 'true',
      lang: 'en',
    })

    const requestUrl = `${SUPADATA_URL}?${params.toString()}`

    // -------------------------------------------------------
    // 5. Call Supadata
    // -------------------------------------------------------

    const response = await fetch(requestUrl, {
      method: 'GET',

      headers: {
        'x-api-key': env.SUPADATA_API_KEY,
        Accept: 'application/json',
      },

      signal: controller.signal,
    })

    // -------------------------------------------------------
    // 6. Read response body
    // -------------------------------------------------------

    const contentType = response.headers.get('content-type') ?? ''

    const rawBody = await response.text()

    // -------------------------------------------------------
    // 7. Parse JSON safely
    // -------------------------------------------------------

    let data: SupadataTranscriptResponse = {}

    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as SupadataTranscriptResponse
      } catch {
        // Supadata may have returned non-JSON.
        // rawBody will be included in the error below.
      }
    }

    // -------------------------------------------------------
    // 8. Handle HTTP errors
    // -------------------------------------------------------

    if (!response.ok) {
      const providerMessage =
        data.message ||
        data.error ||
        data.details ||
        rawBody.slice(0, 500) ||
        'No response body'

      // Single-line, copy-paste friendly: everything needed to debug the
      // failure (key validity, quota, region blocks) is in the thrown error.
      const errorMessage =
        `Supadata transcript request failed for video ${videoId}: ` +
        `HTTP ${response.status} ${response.statusText} | ` +
        `error=${data.error ?? 'none'} | message=${providerMessage}` +
        (data.documentationUrl ? ` | docs=${data.documentationUrl}` : '')

      logger.error(
        {
          videoId,
          youtubeUrl,
          status: response.status,
          statusText: response.statusText,
          contentType,
          providerError: data.error,
          providerMessage,
          documentationUrl: data.documentationUrl,
          rawBody: rawBody.slice(0, 500),
        },
        errorMessage,
      )

      throw new Error(errorMessage)
    }

    // -------------------------------------------------------
    // 9. Extract transcript text
    // -------------------------------------------------------

    const text = normalizeTranscript(data.content)

    // -------------------------------------------------------
    // 10. Handle empty transcript
    // -------------------------------------------------------

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
          `Available languages: ${
            data.availableLangs?.join(', ') || 'unknown'
          }`,
      )
    }

    // -------------------------------------------------------
    // 11. Success
    // -------------------------------------------------------

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
    // -------------------------------------------------------
    // 12. Timeout
    // -------------------------------------------------------

    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(
        {
          videoId,
          timeoutMs: REQUEST_TIMEOUT_MS,
        },
        'Supadata transcript request timed out',
      )

      throw new Error(
        `Supadata transcript request timed out after ${
          REQUEST_TIMEOUT_MS / 1000
        }s for video ${videoId}.`,
      )
    }

    // -------------------------------------------------------
    // 13. Normal error
    // -------------------------------------------------------

    if (error instanceof Error) {
      throw error
    }

    // -------------------------------------------------------
    // 14. Unknown error
    // -------------------------------------------------------

    throw new Error(`Unknown Supadata error: ${String(error)}`)
  } finally {
    // -------------------------------------------------------
    // 15. Always clear timeout
    // -------------------------------------------------------

    clearTimeout(timeout)
  }
}

export const youtubeService = {
  extractVideoId,
  fetchTranscript,
}