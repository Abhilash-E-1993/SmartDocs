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

/* -------------------------------------------------------------------------- */
/* Sentinels                                                                   */
/* -------------------------------------------------------------------------- */

const CAPTIONS_DISABLED = 'CAPTIONS_DISABLED'
const IP_BLOCKED = 'IP_BLOCKED'

/* -------------------------------------------------------------------------- */
/* Networking                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * fetch used only for YouTube calls. When YOUTUBE_PROXY_URL is set, requests
 * are routed through that HTTP proxy (bypasses datacenter-IP blocks); otherwise
 * the global fetch is used.
 */
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

// Build the proxy agent once. Creating a ProxyAgent per request leaks sockets.
let proxyAgent: ProxyAgent | null | undefined

function getProxyAgent(): ProxyAgent | null {
  if (proxyAgent === undefined) {
    proxyAgent = env.YOUTUBE_PROXY_URL ? new ProxyAgent(env.YOUTUBE_PROXY_URL) : null
    if (proxyAgent) {
      logger.info('YouTube requests are routed through YOUTUBE_PROXY_URL')
    } else {
      logger.warn(
        'YOUTUBE_PROXY_URL is not set — YouTube may block transcript requests from this IP',
      )
    }
  }
  return proxyAgent
}

let cachedFetch: FetchLike | null = null

function youtubeFetch(): FetchLike {
  if (cachedFetch) {
    return cachedFetch
  }

  const agent = getProxyAgent()
  cachedFetch = agent
    ? (input, init) =>
        undiciFetch(input as string, {
          ...(init as Record<string, unknown>),
          dispatcher: agent,
        }) as unknown as Promise<Response>
    : (input, init) => fetch(input, init)

  return cachedFetch
}

/* -------------------------------------------------------------------------- */
/* InnerTube session                                                           */
/* -------------------------------------------------------------------------- */

let innertubePromise: Promise<Innertube> | null = null

/**
 * Shared InnerTube session. A WEB client session issues API calls; the player
 * request itself is re-issued under several client contexts (see
 * PLAYER_CLIENTS), because YouTube has been progressively stripping
 * `captionTracks` from some client responses and blocking others on
 * datacenter IPs.
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

/** Reset the cached session so a transient auth/session failure can recover. */
function resetInnertube(): void {
  innertubePromise = null
}

/**
 * Client contexts tried in order. ANDROID/iOS survive bot checks best but often
 * omit captions now; TV_EMBEDDED / MWEB / WEB still return caption tracks.
 * NOTE: youtubei.js expects the exact string `iOS`, not `IOS`.
 */
const PLAYER_CLIENTS = ['ANDROID', 'iOS', 'TV_EMBEDDED', 'MWEB', 'WEB'] as const
type PlayerClient = (typeof PLAYER_CLIENTS)[number]

/**
 * A matching User-Agent is required. YouTube returns an empty body for
 * timedtext requests that arrive with no (or a non-browser) User-Agent.
 */
const CLIENT_USER_AGENT: Record<PlayerClient, string> = {
  ANDROID: 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US) gzip',
  iOS: 'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_1 like Mac OS X; en_US)',
  TV_EMBEDDED:
    'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
  MWEB: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  WEB: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

function captionHeaders(client: PlayerClient): Record<string, string> {
  return {
    'User-Agent': CLIENT_USER_AGENT[client],
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: '*/*',
    Origin: 'https://www.youtube.com',
    Referer: 'https://www.youtube.com/',
  }
}

/* -------------------------------------------------------------------------- */
/* Caption track selection + parsing                                           */
/* -------------------------------------------------------------------------- */

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

/** Append/override a query parameter on a caption URL. */
function withFormat(base: string, fmt: string): string {
  try {
    const url = new URL(base)
    url.searchParams.set('fmt', fmt)
    return url.toString()
  } catch {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}fmt=${fmt}`
  }
}

/** Parse YouTube's json3 caption format (most reliable format today). */
function parseJson3(body: string): string {
  let data: { events?: { segs?: { utf8?: string }[] }[] }
  try {
    data = JSON.parse(body) as typeof data
  } catch {
    return ''
  }

  return (data.events ?? [])
    .flatMap((event) => event.segs ?? [])
    .map((seg) => seg.utf8 ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
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
 * Download one caption track. Tries json3 first, then srv3, then the bare URL,
 * because YouTube now returns empty bodies for some format/URL combinations.
 */
async function downloadCaptions(base: string, client: PlayerClient): Promise<string> {
  const doFetch = youtubeFetch()
  const headers = captionHeaders(client)
  const attempts: { url: string; parse: (body: string) => string }[] = [
    { url: withFormat(base, 'json3'), parse: parseJson3 },
    { url: withFormat(base, 'srv3'), parse: parseTimedText },
    { url: base, parse: parseTimedText },
  ]

  let lastStatus = 0
  for (const attempt of attempts) {
    let res: Response
    try {
      res = await doFetch(attempt.url, { headers })
    } catch (err) {
      logger.debug({ err, client }, 'Caption download request failed')
      continue
    }

    lastStatus = res.status
    if (!res.ok) {
      continue
    }

    const body = await res.text()
    if (!body.trim()) {
      continue
    }

    const text = attempt.parse(body)
    if (text) {
      return text
    }
  }

  throw new Error(
    lastStatus && lastStatus !== 200
      ? `Failed to fetch caption data: HTTP ${lastStatus}`
      : 'Caption track returned no usable text',
  )
}

/* -------------------------------------------------------------------------- */
/* Extraction strategies                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Primary extractor: YouTube's internal InnerTube player API. Unlike the
 * watch-page HTML scrape, this keeps working from cloud/datacenter IPs that
 * YouTube bot-detects — provided the client context is one YouTube still
 * serves caption tracks to.
 */
async function fetchViaInnerTube(videoId: string, client: PlayerClient): Promise<string> {
  const yt = await getInnertube()

  const player = (await yt.actions.execute('/player', {
    videoId,
    client,
    parse: false,
  } as Record<string, unknown>)) as {
    data?: {
      playabilityStatus?: { status?: string; reason?: string }
    } & Record<string, unknown>
  }

  const data = player?.data
  const playability = data?.playabilityStatus?.status
  const reason = data?.playabilityStatus?.reason ?? ''

  if (
    playability === 'LOGIN_REQUIRED' ||
    /not a bot|sign in to confirm/i.test(reason)
  ) {
    throw new Error(IP_BLOCKED)
  }

  if (playability && playability !== 'OK' && playability !== 'LIVE_STREAM_OFFLINE') {
    throw new Error(
      `YouTube player reported the video as ${playability.toLowerCase().replace(/_/g, ' ')}`,
    )
  }

  const tracks = captionTracksFrom(data)
  if (tracks.length === 0) {
    // NOTE: an empty list here is ambiguous — it can mean captions are really
    // off, OR that this client context simply no longer returns them. The
    // caller must try the remaining clients before trusting it.
    throw new Error(CAPTIONS_DISABLED)
  }

  const track = pickTrack(tracks)
  const base = track ? trackUrl(track) : undefined
  if (!base) {
    throw new Error(CAPTIONS_DISABLED)
  }

  return downloadCaptions(base, client)
}

/**
 * Secondary extractor: the transcript panel endpoint (the "Show transcript"
 * button). It does not rely on signed timedtext URLs, so it often works when
 * the caption tracks above come back empty.
 */
async function fetchViaTranscriptPanel(videoId: string): Promise<string> {
  const yt = await getInnertube()
  const info = (await yt.getInfo(videoId)) as unknown as {
    getTranscript?: () => Promise<unknown>
  }

  if (typeof info?.getTranscript !== 'function') {
    throw new Error('Transcript panel is not supported by this youtubei.js version')
  }

  const panel = (await info.getTranscript()) as {
    transcript?: {
      content?: {
        body?: { initial_segments?: { snippet?: { text?: string } }[] }
      }
    }
  }

  const segments = panel?.transcript?.content?.body?.initial_segments ?? []
  const text = segments
    .map((segment) => segment?.snippet?.text ?? '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    throw new Error(CAPTIONS_DISABLED)
  }

  return decodeEntities(text)
}

/** Final fallback: the classic watch-page scrape (works on a clean IP or via proxy). */
async function fetchViaScraper(url: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(url, {
    fetch: youtubeFetch() as unknown as typeof fetch,
  })
  return decodeEntities(segments.map((segment) => segment.text).join(' '))
}

/* -------------------------------------------------------------------------- */
/* Error mapping                                                               */
/* -------------------------------------------------------------------------- */

/** Maps a transcript failure to a clear, actionable user message. */
function describeTranscriptError(error: unknown): string {
  // The library's error instances keep `.name === "Error"`; the discriminator
  // is the class name, read from the constructor.
  const className =
    error && typeof error === 'object'
      ? ((error as { constructor?: { name?: unknown } }).constructor?.name as string | undefined)
      : undefined
  // Serialized errors (e.g. surfaced through Inngest) lose their class identity,
  // so fall back to matching the message text.
  const message = error instanceof Error ? error.message : ''

  switch (true) {
    case message === CAPTIONS_DISABLED:
      return 'Captions are disabled for this video, so there is no transcript to import'
    case message === IP_BLOCKED ||
      message.includes('not a bot') ||
      message.includes('Sign in to confirm'):
      return 'YouTube is currently blocking requests from this server. Please try again later.'
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

/** Picks the most informative error out of everything that was tried. */
function mostInformative(errors: unknown[]): unknown {
  const messageOf = (e: unknown) => (e instanceof Error ? e.message : '')

  return (
    errors.find((e) => messageOf(e) === IP_BLOCKED) ??
    errors.find((e) => /429|too many requests/i.test(messageOf(e))) ??
    errors.find((e) => /unavailable|no longer available|unplayable|reported the video as/i.test(messageOf(e))) ??
    errors.find((e) => messageOf(e) === CAPTIONS_DISABLED) ??
    errors[0]
  )
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  const errors: unknown[] = []

  // 1. InnerTube player, across every client context that may still expose
  //    caption tracks. A CAPTIONS_DISABLED from one client is NOT conclusive.
  for (const client of PLAYER_CLIENTS) {
    try {
      const text = await withRetry(() => fetchViaInnerTube(videoId, client), {
        attempts: 1,
        label: `youtube-innertube-${client.toLowerCase()}`,
      })
      return { videoId, text }
    } catch (err) {
      errors.push(err)
      logger.warn(
        { err, videoId, client },
        'InnerTube transcript fetch failed, trying next strategy',
      )
      if (err instanceof Error && err.message === IP_BLOCKED) {
        // Session may be poisoned; rebuild it before the next attempt.
        resetInnertube()
      }
    }
  }

  // 2. Transcript panel endpoint.
  try {
    const text = await withRetry(() => fetchViaTranscriptPanel(videoId), {
      attempts: 2,
      label: 'youtube-transcript-panel',
    })
    return { videoId, text }
  } catch (err) {
    errors.push(err)
    logger.warn({ err, videoId }, 'Transcript panel fetch failed, trying scraper fallback')
  }

  // 3. Watch-page scrape.
  try {
    const text = await withRetry(() => fetchViaScraper(url), {
      attempts: 2,
      label: 'youtube-transcript',
    })
    return { videoId, text }
  } catch (err) {
    errors.push(err)
  }

  const chosen = mostInformative(errors)
  logger.error(
    {
      videoId,
      proxyConfigured: Boolean(env.YOUTUBE_PROXY_URL),
      attempts: errors.map((e) => (e instanceof Error ? e.message : String(e))),
    },
    'All YouTube transcript strategies failed',
  )

  throw new Error(describeTranscriptError(chosen), { cause: chosen })
}

export const youtubeService = { extractVideoId, getTranscript }