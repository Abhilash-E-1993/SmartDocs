import { YoutubeTranscript } from 'youtube-transcript'

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
]

function extractVideoId(url: string): string | null {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = pattern.exec(url)
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

/** Maps a youtube-transcript failure to a clear, actionable user message. */
function describeTranscriptError(error: unknown): string {
  // The library's error instances keep `.name === "Error"`; the discriminator
  // is the class name, read from the constructor.
  const className =
    error && typeof error === 'object'
      ? ((error as { constructor?: { name?: unknown } }).constructor?.name as
          | string
          | undefined)
      : undefined
  // Serialized errors (e.g. surfaced through Inngest) lose their class identity,
  // so fall back to matching the message text.
  const message = error instanceof Error ? error.message : ''
  switch (true) {
    case className === 'YoutubeTranscriptTooManyRequestError' ||
      message.includes('too many requests'):
      return 'YouTube temporarily rate-limited the transcript request — please retry in a few minutes'
    case className === 'YoutubeTranscriptVideoUnavailableError' ||
      message.includes('no longer available'):
      return 'This YouTube video is unavailable (private, deleted, or region-locked)'
    case className === 'YoutubeTranscriptDisabledError' ||
      message.includes('Transcript is disabled'):
      return 'Captions are disabled for this video, so there is no transcript to import'
    case className === 'YoutubeTranscriptNotAvailableLanguageError':
      return 'No transcript is available in a supported language for this video'
    default:
      return 'No transcript is available for this video'
  }
}

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  // Long videos make YouTube's transcript endpoint flaky — transient network
  // failures and IP rate-limiting are retried with backoff; permanent ones
  // (captions disabled, unavailable video) still fail fast.
  let segments
  try {
    segments = await withRetry(() => YoutubeTranscript.fetchTranscript(url), {
      attempts: 4,
      label: 'youtube-transcript',
    })
  } catch (error) {
    logger.warn({ err: error, videoId }, 'YouTube transcript fetch failed')
    throw new Error(describeTranscriptError(error), { cause: error })
  }

  if (segments.length === 0) {
    throw new Error('No transcript is available for this video')
  }

  const text = decodeEntities(segments.map((segment) => segment.text).join(' '))
  return { videoId, text }
}

export const youtubeService = { extractVideoId, getTranscript }
