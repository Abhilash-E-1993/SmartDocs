import { YoutubeTranscript } from 'youtube-transcript'

import { ApiError } from '../utils/api-error'

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

  const segments = await YoutubeTranscript.fetchTranscript(url).catch(() => {
    throw new Error('No transcript is available for this video')
  })

  if (segments.length === 0) {
    throw new Error('No transcript is available for this video')
  }

  const text = decodeEntities(segments.map((segment) => segment.text).join(' '))
  return { videoId, text }
}

export const youtubeService = { extractVideoId, getTranscript }
