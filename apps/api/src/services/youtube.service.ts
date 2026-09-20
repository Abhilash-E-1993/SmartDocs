
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

/* -------------------------------------------------------------------------- */
/* Sentinels                                                                  */
/* -------------------------------------------------------------------------- */

const CAPTIONS_DISABLED = 'CAPTIONS_DISABLED'
const IP_BLOCKED = 'IP_BLOCKED'
const YOUTUBE_HTTP_403 = 'YOUTUBE_HTTP_403'
const YOUTUBE_HTTP_429 = 'YOUTUBE_HTTP_429'

/* -------------------------------------------------------------------------- */
/* Networking                                                                 */
/* -------------------------------------------------------------------------- */

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

let proxyAgent: ProxyAgent | null | undefined

function getProxyAgent(): ProxyAgent | null {
  if (proxyAgent === undefined) {
    proxyAgent = env.YOUTUBE_PROXY_URL
      ? new ProxyAgent(env.YOUTUBE_PROXY_URL)
      : null

    if (proxyAgent) {
      logger.info(
        {
          proxyConfigured: true,
        },
        'YouTube requests are routed through YOUTUBE_PROXY_URL',
      )
    } else {
      logger.warn(
        {
          proxyConfigured: false,
        },
        'YOUTUBE_PROXY_URL is not set — YouTube requests use the Render server IP',
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
/* Error diagnostics                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Convert any unknown error into a useful string.
 *
 * Important because:
 * - normal Error objects have message/stack
 * - youtubei.js errors may expose statusCode/status
 * - Inngest serialization can remove class information
 */
function getErrorDetails(error: unknown): {
  message: string
  name: string
  status?: number
  stack?: string
} {
  if (error instanceof Error) {
    const candidate = error as Error & {
      status?: number
      statusCode?: number
      response?: {
        status?: number
      }
    }

    return {
      message: error.message || 'Unknown error',
      name: error.name || error.constructor?.name || 'Error',
      status:
        candidate.status ??
        candidate.statusCode ??
        candidate.response?.status,
      stack: error.stack,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>

    return {
      message: String(value.message ?? value.error ?? 'Unknown error'),
      name: String(value.name ?? 'UnknownError'),
      status:
        typeof value.status === 'number'
          ? value.status
          : typeof value.statusCode === 'number'
            ? value.statusCode
            : undefined,
    }
  }

  return {
    message: String(error),
    name: 'UnknownError',
  }
}

/**
 * Extract HTTP status from youtubei.js / fetch style errors.
 *
 * youtubei.js may put the status directly in the message:
 *
 * "Request to ... failed with status code 403"
 */
function getHttpStatus(error: unknown): number | undefined {
  const details = getErrorDetails(error)

  if (details.status) {
    return details.status
  }

  const match = details.message.match(
    /status code\s+(\d{3})/i,
  )

  if (match) {
    return Number(match[1])
  }

  const httpMatch = details.message.match(
    /\bHTTP\s+(\d{3})\b/i,
  )

  if (httpMatch) {
    return Number(httpMatch[1])
  }

  return undefined
}

/**
 * Convert a raw error into a stable internal category.
 *
 * IMPORTANT:
 * 403 is NOT automatically called IP_BLOCKED.
 * It is classified as YOUTUBE_HTTP_403 so we don't claim
 * something that the response itself doesn't prove.
 */
function classifyYoutubeError(error: unknown): string {
  const details = getErrorDetails(error)
  const message = details.message
  const status = getHttpStatus(error)

  if (message === IP_BLOCKED) {
    return IP_BLOCKED
  }

  if (
    /not a bot|sign in to confirm|login_required/i.test(message)
  ) {
    return IP_BLOCKED
  }

  if (status === 403) {
    return YOUTUBE_HTTP_403
  }

  if (
    status === 429 ||
    /too many requests|\b429\b/i.test(message)
  ) {
    return YOUTUBE_HTTP_429
  }

  if (
    message === CAPTIONS_DISABLED ||
    /transcript is disabled|captions are disabled/i.test(message)
  ) {
    return CAPTIONS_DISABLED
  }

  return 'UNKNOWN'
}

/**
 * Create a compact diagnostic representation for logs.
 */
function diagnosticError(error: unknown) {
  const details = getErrorDetails(error)

  return {
    category: classifyYoutubeError(error),
    name: details.name,
    message: details.message,
    status: getHttpStatus(error),
  }
}

/* -------------------------------------------------------------------------- */
/* InnerTube session                                                          */
/* -------------------------------------------------------------------------- */

let innertubePromise: Promise<Innertube> | null = null

function getInnertube(): Promise<Innertube> {
  innertubePromise ??= Innertube.create({
    client_type: ClientType.WEB,
    generate_session_locally: true,
    retrieve_player: false,
    fetch: youtubeFetch(),
  })

  return innertubePromise
}

function resetInnertube(): void {
  innertubePromise = null

  logger.info(
    'Reset cached YouTube InnerTube session',
  )
}

/* -------------------------------------------------------------------------- */
/* Player clients                                                             */
/* -------------------------------------------------------------------------- */

const PLAYER_CLIENTS = [
  'ANDROID',
  'iOS',
  'TV_EMBEDDED',
  'MWEB',
  'WEB',
] as const

type PlayerClient = (typeof PLAYER_CLIENTS)[number]

const CLIENT_USER_AGENT: Record<PlayerClient, string> = {
  ANDROID:
    'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US) gzip',

  iOS:
    'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_1 like Mac OS X; en_US)',

  TV_EMBEDDED:
    'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',

  MWEB:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',

  WEB:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

function captionHeaders(
  client: PlayerClient,
): Record<string, string> {
  return {
    'User-Agent': CLIENT_USER_AGENT[client],
    'Accept-Language': 'en-US,en;q=0.9',
    Accept: '*/*',
    Origin: 'https://www.youtube.com',
    Referer: 'https://www.youtube.com/',
  }
}

/* -------------------------------------------------------------------------- */
/* Caption track selection + parsing                                          */
/* -------------------------------------------------------------------------- */

interface CaptionTrack {
  baseUrl?: string
  base_url?: string
  languageCode?: string
  language_code?: string
  kind?: string
}

function captionTracksFrom(
  playerData: unknown,
): CaptionTrack[] {
  const tracks = (
    playerData as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: CaptionTrack[]
        }
      }
    }
  )?.captions?.playerCaptionsTracklistRenderer?.captionTracks

  return Array.isArray(tracks) ? tracks : []
}

function pickTrack(
  tracks: CaptionTrack[],
): CaptionTrack | undefined {
  return (
    tracks.find((track) =>
      (track.languageCode ?? track.language_code)
        ?.startsWith('en'),
    ) ??
    tracks.find((track) => track.kind !== 'asr') ??
    tracks[0]
  )
}

function trackUrl(
  track: CaptionTrack,
): string | undefined {
  return track.baseUrl ?? track.base_url
}

function withFormat(
  base: string,
  fmt: string,
): string {
  try {
    const url = new URL(base)
    url.searchParams.set('fmt', fmt)
    return url.toString()
  } catch {
    const separator = base.includes('?') ? '&' : '?'
    return `${base}${separator}fmt=${fmt}`
  }
}

function parseJson3(body: string): string {
  let data: {
    events?: {
      segs?: {
        utf8?: string
      }[]
    }[]
  }

  try {
    data = JSON.parse(body) as typeof data
  } catch {
    return ''
  }

  return (data.events ?? [])
    .flatMap((event) => event.segs ?? [])
    .map((segment) => segment.utf8 ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTimedText(xml: string): string {
  const paragraphs = [
    ...xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g),
  ]

  if (paragraphs.length > 0) {
    const text = paragraphs
      .map((match) => {
        const clean = match[1].replace(/<[^>]+>/g, '')
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

  const textNodes = [
    ...xml.matchAll(
      /<text\b[^>]*>([\s\S]*?)<\/text>/g,
    ),
  ]

  if (textNodes.length > 0) {
    const text = textNodes
      .map((match) => {
        const clean = match[1].replace(/<[^>]+>/g, '')
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

  const words = [
    ...xml.matchAll(
      /<s\b[^>]*>([\s\S]*?)<\/s>/g,
    ),
  ].map((match) => decodeEntities(match[1]))

  if (words.length > 0) {
    return words
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return ''
}

/* -------------------------------------------------------------------------- */
/* Caption downloading                                                        */
/* -------------------------------------------------------------------------- */

async function downloadCaptions(
  base: string,
  client: PlayerClient,
): Promise<string> {
  const doFetch = youtubeFetch()
  const headers = captionHeaders(client)

  const attempts: {
    format: string
    url: string
    parse: (body: string) => string
  }[] = [
    {
      format: 'json3',
      url: withFormat(base, 'json3'),
      parse: parseJson3,
    },
    {
      format: 'srv3',
      url: withFormat(base, 'srv3'),
      parse: parseTimedText,
    },
    {
      format: 'raw',
      url: base,
      parse: parseTimedText,
    },
  ]

  let lastStatus = 0
  let lastError: unknown = null

  for (const attempt of attempts) {
    let response: Response

    try {
      response = await doFetch(attempt.url, {
        headers,
      })
    } catch (error) {
      lastError = error

      logger.warn(
        {
          client,
          format: attempt.format,
          error: diagnosticError(error),
        },
        'YouTube caption request threw an exception',
      )

      continue
    }

    lastStatus = response.status

    logger.info(
      {
        client,
        format: attempt.format,
        status: response.status,
        ok: response.ok,
      },
      'YouTube caption request completed',
    )

    if (!response.ok) {
      lastError = new Error(
        `Caption request failed with HTTP ${response.status}`,
      )

      continue
    }

    const body = await response.text()

    if (!body.trim()) {
      lastError = new Error(
        'Caption endpoint returned an empty body',
      )

      continue
    }

    const text = attempt.parse(body)

    if (text) {
      return text
    }

    lastError = new Error(
      `Caption ${attempt.format} response could not be parsed`,
    )
  }

  if (lastStatus === 403) {
    throw new Error(
      `YouTube caption request returned HTTP 403`,
      {
        cause: lastError,
      },
    )
  }

  if (lastStatus === 429) {
    throw new Error(
      `YouTube caption request returned HTTP 429`,
      {
        cause: lastError,
      },
    )
  }

  throw new Error(
    lastStatus
      ? `Failed to fetch caption data: HTTP ${lastStatus}`
      : 'Caption track returned no usable text',
    {
      cause: lastError ?? undefined,
    },
  )
}

/* -------------------------------------------------------------------------- */
/* Extraction strategies                                                      */
/* -------------------------------------------------------------------------- */

async function fetchViaInnerTube(
  videoId: string,
  client: PlayerClient,
): Promise<string> {
  const yt = await getInnertube()

  logger.info(
    {
      videoId,
      client,
      proxyConfigured: Boolean(
        env.YOUTUBE_PROXY_URL,
      ),
    },
    'Starting YouTube InnerTube transcript attempt',
  )

  try {
    const player = (await yt.actions.execute(
      '/player',
      {
        videoId,
        client,
        parse: false,
      } as Record<string, unknown>,
    )) as {
      data?: {
        playabilityStatus?: {
          status?: string
          reason?: string
        }
      } & Record<string, unknown>
    }

    const data = player?.data

    const playability =
      data?.playabilityStatus?.status

    const reason =
      data?.playabilityStatus?.reason ?? ''

    logger.info(
      {
        videoId,
        client,
        playability,
        reason,
      },
      'YouTube InnerTube player response received',
    )

    if (
      playability === 'LOGIN_REQUIRED' ||
      /not a bot|sign in to confirm/i.test(reason)
    ) {
      const error = new Error(
        `${IP_BLOCKED}: YouTube returned LOGIN_REQUIRED. Reason: ${reason || 'none provided'}`,
      )

      throw error
    }

    if (
      playability &&
      playability !== 'OK' &&
      playability !== 'LIVE_STREAM_OFFLINE'
    ) {
      throw new Error(
        `YouTube player reported the video as ${playability.toLowerCase().replace(/_/g, ' ')}`,
      )
    }

    const tracks = captionTracksFrom(data)

    logger.info(
      {
        videoId,
        client,
        captionTrackCount: tracks.length,
        captionLanguages: tracks.map(
          (track) =>
            track.languageCode ??
            track.language_code ??
            'unknown',
        ),
      },
      'YouTube caption tracks inspected',
    )

    if (tracks.length === 0) {
      throw new Error(CAPTIONS_DISABLED)
    }

    const track = pickTrack(tracks)
    const base = track ? trackUrl(track) : undefined

    if (!base) {
      throw new Error(CAPTIONS_DISABLED)
    }

    return await downloadCaptions(base, client)
  } catch (error) {
    logger.error(
      {
        videoId,
        client,
        error: diagnosticError(error),
      },
      'YouTube InnerTube attempt failed',
    )

    throw error
  }
}

async function fetchViaTranscriptPanel(
  videoId: string,
): Promise<string> {
  const yt = await getInnertube()

  logger.info(
    { videoId },
    'Starting YouTube transcript panel attempt',
  )

  try {
    const info = (await yt.getInfo(
      videoId,
    )) as unknown as {
      getTranscript?: () => Promise<unknown>
    }

    if (
      typeof info?.getTranscript !== 'function'
    ) {
      throw new Error(
        'Transcript panel is not supported by this youtubei.js version',
      )
    }

    const panel = (await info.getTranscript()) as {
      transcript?: {
        content?: {
          body?: {
            initial_segments?: {
              snippet?: {
                text?: string
              }
            }[]
          }
        }
      }
    }

    const segments =
      panel?.transcript?.content?.body
        ?.initial_segments ?? []

    const text = segments
      .map(
        (segment) =>
          segment?.snippet?.text ?? '',
      )
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) {
      throw new Error(CAPTIONS_DISABLED)
    }

    return decodeEntities(text)
  } catch (error) {
    logger.error(
      {
        videoId,
        error: diagnosticError(error),
      },
      'YouTube transcript panel attempt failed',
    )

    throw error
  }
}

async function fetchViaScraper(
  url: string,
): Promise<string> {
  logger.info(
    {
      url,
      proxyConfigured: Boolean(
        env.YOUTUBE_PROXY_URL,
      ),
    },
    'Starting YouTube watch-page scraper attempt',
  )

  try {
    const segments =
      await YoutubeTranscript.fetchTranscript(
        url,
        {
          fetch:
            youtubeFetch() as unknown as typeof fetch,
        },
      )

    const text = decodeEntities(
      segments
        .map((segment) => segment.text)
        .join(' '),
    )

    if (!text.trim()) {
      throw new Error(
        'YouTube scraper returned an empty transcript',
      )
    }

    return text
  } catch (error) {
    logger.error(
      {
        url,
        error: diagnosticError(error),
      },
      'YouTube scraper attempt failed',
    )

    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* Error mapping                                                              */
/* -------------------------------------------------------------------------- */

function describeTranscriptError(
  error: unknown,
): string {
  const details = getErrorDetails(error)
  const message = details.message
  const category = classifyYoutubeError(error)

  switch (category) {
    case CAPTIONS_DISABLED:
      return 'Captions are disabled or no caption tracks were returned for this video.'

    case IP_BLOCKED:
      return `YouTube rejected this server request as a bot/login challenge. Original error: ${message}`

    case YOUTUBE_HTTP_403:
      return `YouTube rejected the request with HTTP 403 Forbidden. Original error: ${message}`

    case YOUTUBE_HTTP_429:
      return `YouTube rate-limited the request with HTTP 429. Original error: ${message}`

    default:
      break
  }

  if (
    /no longer available|unplayable/i.test(
      message,
    )
  ) {
    return `This YouTube video appears to be unavailable. Original error: ${message}`
  }

  if (
    /YoutubeTranscriptNotAvailableLanguageError/i.test(
      details.name,
    )
  ) {
    return `No transcript is available in a supported language. Original error: ${message}`
  }

  if (
    /Transcript is disabled/i.test(message)
  ) {
    return `Captions are disabled for this video. Original error: ${message}`
  }

  return `YouTube transcript extraction failed. Original error: ${message}`
}

/**
 * Select the most useful error.
 *
 * Priority:
 * 1. Explicit bot/login block
 * 2. HTTP 403
 * 3. HTTP 429
 * 4. Video unavailable
 * 5. Captions disabled
 * 6. First error
 */
function mostInformative(
  errors: unknown[],
): unknown {
  const categoryOf = (error: unknown) =>
    classifyYoutubeError(error)

  return (
    errors.find(
      (error) =>
        categoryOf(error) === IP_BLOCKED,
    ) ??
    errors.find(
      (error) =>
        categoryOf(error) === YOUTUBE_HTTP_403,
    ) ??
    errors.find(
      (error) =>
        categoryOf(error) === YOUTUBE_HTTP_429,
    ) ??
    errors.find(
      (error) =>
        /unavailable|no longer available|unplayable|reported the video as/i.test(
          getErrorDetails(error).message,
        ),
    ) ??
    errors.find(
      (error) =>
        categoryOf(error) === CAPTIONS_DISABLED,
    ) ??
    errors[0]
  )
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

async function getTranscript(
  url: string,
): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw ApiError.badRequest(
      'Invalid YouTube URL',
    )
  }

  const errors: unknown[] = []

  logger.info(
    {
      videoId,
      proxyConfigured: Boolean(
        env.YOUTUBE_PROXY_URL,
      ),
    },
    'Starting YouTube transcript extraction',
  )

  /* ---------------------------------------------------------------------- */
  /* 1. InnerTube                                                           */
  /* ---------------------------------------------------------------------- */

  for (const client of PLAYER_CLIENTS) {
    try {
      const text = await withRetry(
        () =>
          fetchViaInnerTube(
            videoId,
            client,
          ),
        {
          attempts: 1,
          label: `youtube-innertube-${client.toLowerCase()}`,
        },
      )

      logger.info(
        {
          videoId,
          client,
          textLength: text.length,
        },
        'YouTube transcript extracted successfully via InnerTube',
      )

      return {
        videoId,
        text,
      }
    } catch (error) {
      errors.push(error)

      logger.warn(
        {
          videoId,
          client,
          error: diagnosticError(error),
        },
        'InnerTube transcript fetch failed; trying next client',
      )

      const category =
        classifyYoutubeError(error)

      if (
        category === IP_BLOCKED ||
        category === YOUTUBE_HTTP_403
      ) {
        /*
         * Rebuild the InnerTube session after a server-side
         * rejection. This preserves your existing recovery behavior.
         */
        resetInnertube()
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 2. Transcript panel                                                    */
  /* ---------------------------------------------------------------------- */

  try {
    const text = await withRetry(
      () =>
        fetchViaTranscriptPanel(
          videoId,
        ),
      {
        attempts: 2,
        label: 'youtube-transcript-panel',
      },
    )

    logger.info(
      {
        videoId,
        textLength: text.length,
      },
      'YouTube transcript extracted successfully via transcript panel',
    )

    return {
      videoId,
      text,
    }
  } catch (error) {
    errors.push(error)

    logger.warn(
      {
        videoId,
        error: diagnosticError(error),
      },
      'Transcript panel failed; trying scraper fallback',
    )
  }

  /* ---------------------------------------------------------------------- */
  /* 3. Watch-page scraper                                                  */
  /* ---------------------------------------------------------------------- */

  try {
    const text = await withRetry(
      () =>
        fetchViaScraper(url),
      {
        attempts: 2,
        label: 'youtube-transcript',
      },
    )

    logger.info(
      {
        videoId,
        textLength: text.length,
      },
      'YouTube transcript extracted successfully via scraper',
    )

    return {
      videoId,
      text,
    }
  } catch (error) {
    errors.push(error)

    logger.warn(
      {
        videoId,
        error: diagnosticError(error),
      },
      'YouTube scraper failed',
    )
  }

  /* ---------------------------------------------------------------------- */
  /* Final diagnostics                                                       */
  /* ---------------------------------------------------------------------- */

  const chosen = mostInformative(errors)

  const attempts = errors.map(
    (error, index) => ({
      attempt: index + 1,
      ...diagnosticError(error),
    }),
  )

  logger.error(
    {
      videoId,
      proxyConfigured: Boolean(
        env.YOUTUBE_PROXY_URL,
      ),
      totalAttempts: errors.length,
      selectedError: diagnosticError(chosen),
      attempts,
    },
    'ALL YouTube transcript strategies failed',
  )

  throw new Error(
    describeTranscriptError(chosen),
    {
      cause: chosen,
    },
  )
}

export const youtubeService = {
  extractVideoId,
  getTranscript,
}

