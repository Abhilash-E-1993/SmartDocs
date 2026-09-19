import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { ClientType, Innertube } from 'youtubei.js'
import { YoutubeTranscript } from 'youtube-transcript'

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
    // Ignore URL parse error and fall back to regexes
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

/**
 * fetch used only for YouTube calls. When YOUTUBE_PROXY_URL is set, requests
 * are routed through that HTTP proxy (bypasses datacenter-IP blocks); otherwise
 * the global fetch is used.
 */
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

function youtubeFetch(): FetchLike {
  const proxy = env.YOUTUBE_PROXY_URL
  if (!proxy) {
    return (input, init) => fetch(input, init)
  }

  const agent = new ProxyAgent(proxy)
  return (input, init) =>
    undiciFetch(input as string, {
      ...(init as Record<string, unknown>),
      dispatcher: agent,
    }) as unknown as Promise<Response>
}

let innertubePromise: Promise<Innertube> | null = null

/**
 * Shared InnerTube session. A WEB client session issues API calls, but the
 * transcript itself is fetched with an ANDROID client context (see
 * fetchViaInnerTube), which YouTube is far less likely to block on datacenter
 * IPs than the watch-page scrape used by `youtube-transcript`.
 */
function getInnertube(): Promise<Innertube> {
  innertubePromise ??= Innertube.create({
    client_type: ClientType.WEB,
    generate_session_locally: true,
    retrieve_player: false,
    fetch: youtubeFetch(),
  })
  return innertubePromise
}

interface CaptionTrack {
  baseUrl?: string
  base_url?: string
  languageCode?: string
  language_code?: string
  kind?: string
}

/** Pull the raw caption track list out of an InnerTube player response. */
function captionTracksFrom(playerData: unknown): CaptionTrack[] {
  const tracks = (
    playerData as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } }
    }
  )?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  return Array.isArray(tracks) ? tracks : []
}

function pickTrack(tracks: CaptionTrack[]): CaptionTrack | undefined {
  // Prefer an English track, then any non-ASR (human) track, else the first.
  return (
    tracks.find((t) => (t.languageCode ?? t.language_code)?.startsWith('en')) ??
    tracks.find((t) => t.kind !== 'asr') ??
    tracks[0]
  )
}

function trackUrl(track: CaptionTrack): string | undefined {
  return track.baseUrl ?? track.base_url
}

/**
 * Extracts plain text from YouTube timedtext XML.
 * Supports:
 * - Format 3: paragraphs <p ...>...</p> (both plain text and auto-generated with <s> word tags)
 * - Format 1 & 2: lines <text ...>...</text>
 * - Word-level fallback: <s ...>...</s>
 */
function parseTimedText(xml: string): string {
  // Format 3: paragraphs enclosed in <p ...>...</p>
  const paragraphs = [...xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
  if (paragraphs.length > 0) {
    const text = paragraphs
      .map((m) => {
        // Strip any inner markup such as <s>, <font>, <b>, etc.
        const clean = m[1].replace(/<[^>]+>/g, '')
        return decodeEntities(clean).trim()
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text) {
      return text
    }
  }

  // Format 1 or 2: caption lines enclosed in <text ...>...</text>
  const textNodes = [...xml.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
  if (textNodes.length > 0) {
    const text = textNodes
      .map((m) => {
        const clean = m[1].replace(/<[^>]+>/g, '')
        return decodeEntities(clean).trim()
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text) {
      return text
    }
  }

  // Word-level fallback: <s>...</s> tags
  const words = [...xml.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/g)].map((m) => decodeEntities(m[1]))
  if (words.length > 0) {
    return words.join(' ').replace(/\s+/g, ' ').trim()
  }

  return ''
}

/**
 * Primary extractor: YouTube's internal InnerTube player API with a mobile
 * (ANDROID or IOS) client context. Unlike the watch-page HTML scrape, this keeps
 * working from cloud/datacenter IPs that YouTube bot-detects.
 */
async function fetchViaInnerTube(
  videoId: string,
  client: 'ANDROID' | 'IOS' = 'ANDROID',
): Promise<string> {
  const yt = await getInnertube()
  const doFetch = youtubeFetch()

  const player = (await yt.actions.execute('/player', {
    videoId,
    client,
    parse: false,
  })) as { data?: { playabilityStatus?: { status?: string } } & Record<string, unknown> }

  const data = player?.data
  const playability = data?.playabilityStatus?.status
  if (playability && playability !== 'OK' && playability !== 'LIVE_STREAM_OFFLINE') {
    // LOGIN_REQUIRED / ERROR typically means IP/bot-blocked; UNPLAYABLE means gone.
    throw new Error(`YouTube player reported the video as ${playability.toLowerCase().replace(/_/g, ' ')}`)
  }

  const tracks = captionTracksFrom(data)
  if (tracks.length === 0) {
    throw new Error('CAPTIONS_DISABLED')
  }

  const track = pickTrack(tracks)
  const base = track ? trackUrl(track) : undefined
  if (!base) {
    throw new Error('CAPTIONS_DISABLED')
  }

  const res = await doFetch(base)
  if (!res.ok) {
    throw new Error(`Failed to fetch caption data: HTTP ${res.status}`)
  }


  const xml = await res.text()
  const text = parseTimedText(xml)
  if (!text) {
    throw new Error('No transcript is available for this video')
  }
  return text
}

/** Fallback extractor: the classic watch-page scrape (fast when the IP is clean or proxy is used). */
async function fetchViaScraper(url: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(url, {
    fetch: youtubeFetch() as unknown as typeof fetch,
  })
  return decodeEntities(segments.map((segment) => segment.text).join(' '))
}

/** Maps a transcript failure to a clear, actionable user message. */
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
    case message === 'CAPTIONS_DISABLED':
      return 'Captions are disabled for this video, so there is no transcript to import'
    case className === 'YoutubeTranscriptTooManyRequestError' ||
      message.includes('too many requests') ||
      message.includes('429'):
      return 'YouTube temporarily rate-limited the transcript request — please retry in a few minutes'

    case className === 'YoutubeTranscriptVideoUnavailableError' ||
      message.includes('no longer available') ||
      message.includes('unplayable'):
      return 'This YouTube video is unavailable (private, deleted, or region-locked)'
    case className === 'YoutubeTranscriptDisabledError' ||
      message.includes('Transcript is disabled'):
      return 'Captions are disabled for this video, so there is no transcript to import'
    case className === 'YoutubeTranscriptNotAvailableLanguageError':
      return 'No transcript is available in a supported language for this video'
    case message.includes('YouTube player reported the video as'):
      return message
    default:
      return 'No transcript is available for this video'
  }
}

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  // Strategy:
  // 1. Try InnerTube with ANDROID client context (survives datacenter bot-checks).
  // 2. If that fails (and is not permanently CAPTIONS_DISABLED), try InnerTube with IOS context.
  // 3. If both fail, fall back to watch-page scraper (works when clean IP or proxy available).
  try {
    const text = await withRetry(() => fetchViaInnerTube(videoId, 'ANDROID'), {
      attempts: 2,
      label: 'youtube-innertube-android',
    })
    return { videoId, text }
  } catch (primaryError) {
    if (primaryError instanceof Error && primaryError.message === 'CAPTIONS_DISABLED') {
      throw new Error(describeTranscriptError(primaryError), { cause: primaryError })
    }

    logger.warn(
      { err: primaryError, videoId },
      'InnerTube ANDROID transcript fetch failed, trying IOS fallback',
    )

    try {
      const text = await withRetry(() => fetchViaInnerTube(videoId, 'IOS'), {
        attempts: 2,
        label: 'youtube-innertube-ios',
      })
      return { videoId, text }
    } catch (iosError) {
      if (iosError instanceof Error && iosError.message === 'CAPTIONS_DISABLED') {
        throw new Error(describeTranscriptError(iosError), { cause: iosError })
      }

      logger.warn(
        { err: iosError, videoId },
        'InnerTube IOS transcript fetch failed, trying scraper fallback',
      )

      try {
        const text = await withRetry(() => fetchViaScraper(url), {
          attempts: 2,
          label: 'youtube-transcript',
        })
        return { videoId, text }
      } catch (fallbackError) {
        logger.warn({ err: fallbackError, videoId }, 'YouTube transcript fetch failed')
        throw new Error(describeTranscriptError(fallbackError || primaryError), {
          cause: fallbackError,
        })
      }
    }
  }
}


export const youtubeService = { extractVideoId, getTranscript }
