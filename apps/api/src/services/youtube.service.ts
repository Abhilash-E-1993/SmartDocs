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

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  // Long videos make YouTube's transcript endpoint flaky — transient network
  // failures are retried with backoff; permanent ones (transcripts disabled,
  // unavailable video) still fail fast.
  let segments
  try {
    segments = await withRetry(() => YoutubeTranscript.fetchTranscript(url), {
      attempts: 3,
      label: 'youtube-transcript',
    })
  } catch (error) {
    logger.warn({ err: error, videoId }, 'YouTube transcript fetch failed')
    throw new Error('No transcript is available for this video', { cause: error })
  }

  if (segments.length === 0) {
    throw new Error('No transcript is available for this video')
  }

  const text = decodeEntities(segments.map((segment) => segment.text).join(' '))
  return { videoId, text }
}

export const youtubeService = { extractVideoId, getTranscript }
