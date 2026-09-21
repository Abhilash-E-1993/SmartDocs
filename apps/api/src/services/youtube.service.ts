import { fetchTranscript } from 'youtube-transcript'

import { env } from '../config/env'
import { logger } from '../config/logger'
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
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Provider 1: Supadata ─────────────────────────────────────────────────────

async function fetchFromSupadata(videoId: string): Promise<string> {
  if (!env.SUPADATA_API_KEY) {
    throw new Error('SUPADATA_API_KEY is not configured — skipping Supadata')
  }

  const SUPADATA_BASE_URL = 'https://api.supadata.ai/v1/youtube/transcript'
  const url = `${SUPADATA_BASE_URL}?videoId=${encodeURIComponent(videoId)}&text=true`

  const response = await fetch(url, {
    headers: { 'x-api-key': env.SUPADATA_API_KEY },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')

    // Detect when Supadata is suspended or returning HTML instead of JSON
    if (
      body.includes('Service Suspended') ||
      body.startsWith('<!DOCTYPE') ||
      body.startsWith('<html')
    ) {
      throw new Error(`Supadata service is unavailable (HTTP ${response.status}, returned HTML)`)
    }

    throw new Error(`Supadata HTTP ${response.status}: ${body.slice(0, 200)}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    const body = await response.text().catch(() => '')
    throw new Error(`Supadata returned HTML instead of JSON — service may be suspended: ${body.slice(0, 100)}`)
  }

  const data = (await response.json()) as { content?: string; error?: string }

  if (!data.content) {
    throw new Error(data.error ?? 'Supadata returned no transcript content')
  }

  return decodeEntities(data.content).replace(/\s+/g, ' ').trim()
}

// ─── Provider 2: youtube-transcript npm package ───────────────────────────────

async function fetchFromYoutubeTranscript(videoId: string): Promise<string> {
  // This package fetches directly from YouTube's internal caption API
  const segments = await fetchTranscript(videoId)

  if (!segments || segments.length === 0) {
    throw new Error(`No transcript segments found for video ${videoId}`)
  }

  const text = segments
    .map((seg) => decodeEntities((seg.text ?? '').trim()))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    throw new Error('youtube-transcript: empty transcript after joining segments')
  }

  return text
}

// ─── Provider 3: youtubei.js (Google InnerTube API) ───────────────────────────

async function fetchFromYoutubei(videoId: string): Promise<string> {
  // Dynamic import — youtubei.js is a pure ESM package
  const { Innertube } = await import('youtubei.js')
  const yt = await Innertube.create({ generate_session_locally: true })
  const info = await yt.getInfo(videoId)

  const transcriptData = await info.getTranscript()
  const segments =
    (transcriptData?.transcript?.content?.body?.initial_segments as Array<{
      snippet?: { text?: string }
    }>) ?? []

  if (segments.length === 0) {
    throw new Error(`youtubei.js: no transcript segments found for video ${videoId}`)
  }

  const text = segments
    .map((seg) => decodeEntities((seg.snippet?.text ?? '').trim()))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    throw new Error('youtubei.js: empty transcript after joining segments')
  }

  return text
}

// ─── Orchestrator: try providers in order, return first success ───────────────

type Provider = { name: string; fetch: () => Promise<string> }

async function tryProviders(videoId: string, providers: Provider[]): Promise<string> {
  const errors: string[] = []

  for (const provider of providers) {
    let lastErr: unknown

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await provider.fetch()

        logger.info(
          { videoId, provider: provider.name, textLength: text.length },
          'YouTube transcript fetched successfully',
        )

        return text
      } catch (err) {
        lastErr = err
        if (attempt < 2) {
          await sleep(1500)
        }
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
    logger.warn(
      { videoId, provider: provider.name, error: msg },
      `Provider ${provider.name} failed after retries — trying next`,
    )
    errors.push(`[${provider.name}] ${msg}`)
  }

  throw new Error(
    `Could not fetch a transcript for this video. It may not have captions, or it may be private/unavailable.\n\nDetails:\n${errors.join('\n')}`,
  )
}

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  logger.info(
    { videoId },
    'Fetching YouTube transcript — trying Supadata → youtube-transcript → youtubei.js',
  )

  const providers: Provider[] = [
    { name: 'supadata', fetch: () => fetchFromSupadata(videoId) },
    { name: 'youtube-transcript', fetch: () => fetchFromYoutubeTranscript(videoId) },
    { name: 'youtubei', fetch: () => fetchFromYoutubei(videoId) },
  ]

  const text = await tryProviders(videoId, providers)

  return { videoId, text }
}

export const youtubeService = { extractVideoId, getTranscript }