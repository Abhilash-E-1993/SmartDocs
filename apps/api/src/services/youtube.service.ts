import { ClientType, Innertube, UniversalCache } from 'youtubei.js'
import { BG } from 'bgutils-js'
import { JSDOM } from 'jsdom'

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
}

/* -------------------------------------------------------------------------- */
/* Error diagnostics — always know exactly why a request failed              */
/* -------------------------------------------------------------------------- */

function getErrorDetails(error: unknown): { message: string; name: string; status?: number } {
  if (error instanceof Error) {
    const candidate = error as Error & { status?: number; statusCode?: number }
    return {
      message: error.message || 'Unknown error',
      name: error.name || error.constructor?.name || 'Error',
      status: candidate.status ?? candidate.statusCode,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>
    return {
      message: String(value.message ?? value.error ?? 'Unknown error'),
      name: String(value.name ?? 'UnknownError'),
      status: typeof value.status === 'number' ? value.status : undefined,
    }
  }

  return { message: String(error), name: 'UnknownError' }
}

/* -------------------------------------------------------------------------- */
/* PoToken generation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * YouTube's "Sign in to confirm you're not a bot" (LOGIN_REQUIRED) challenge
 * checks for a proof-of-origin token (PoToken). Supplying one is a different
 * signal than IP reputation and can succeed even from a flagged server IP.
 * Minted using bgutils-js, which implements YouTube's own BotGuard challenge.
 *
 * Cached in memory and reused across requests until it goes stale (6h) or a
 * request comes back blocked, at which point resetSession() clears it so the
 * next call mints a fresh one.
 */
interface PoTokenResult {
  visitorData: string
  poToken: string
  generatedAt: number
}

const POTOKEN_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let poTokenPromise: Promise<PoTokenResult | null> | null = null

async function generatePoToken(): Promise<PoTokenResult | null> {
  try {
    // Throwaway session purely to obtain a visitorData value from YouTube.
    const bootstrapSession = await Innertube.create({
      client_type: ClientType.WEB,
      generate_session_locally: true,
      retrieve_player: false,
    })

    const visitorData = bootstrapSession.session.context.client.visitorData
    if (!visitorData) {
      throw new Error('Could not obtain visitorData for PoToken generation')
    }

    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
      url: 'https://www.youtube.com/',
    })

    Object.assign(globalThis, {
      window: dom.window as unknown as typeof globalThis,
      document: dom.window.document,
    })

    const bgConfig = {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input as string, init),
      globalObj: globalThis,
      identifier: visitorData,
      requestKey: 'O43z0dpjhgX20SCx4KAo',
    }

    const bgChallenge = await BG.Challenge.create(bgConfig)
    if (!bgChallenge) {
      throw new Error('Failed to create BotGuard challenge')
    }

    const interpreterJavascript =
      bgChallenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue

    if (!interpreterJavascript) {
      throw new Error('BotGuard challenge did not return an interpreter script')
    }

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(interpreterJavascript)()

    const poTokenResult = await BG.PoToken.generate({
      program: bgChallenge.program,
      bgConfig,
      globalName: bgChallenge.globalName,
    })

    if (!poTokenResult?.poToken) {
      throw new Error('BotGuard did not return a PoToken')
    }

    logger.info('Generated fresh YouTube PoToken')

    return { visitorData, poToken: poTokenResult.poToken, generatedAt: Date.now() }
  } catch (error) {
    // PoToken is best-effort: log why, fall through to an unauthenticated
    // session rather than blocking transcript extraction entirely.
    logger.warn({ error: getErrorDetails(error) }, 'PoToken generation failed; continuing without it')
    return null
  }
}

async function getPoToken(): Promise<PoTokenResult | null> {
  poTokenPromise ??= generatePoToken()

  const cached = await poTokenPromise
  if (cached && Date.now() - cached.generatedAt > POTOKEN_TTL_MS) {
    poTokenPromise = generatePoToken()
    return poTokenPromise
  }

  return cached
}

/* -------------------------------------------------------------------------- */
/* InnerTube session                                                          */
/* -------------------------------------------------------------------------- */

let innertubePromise: Promise<Innertube> | null = null

function getInnertube(): Promise<Innertube> {
  innertubePromise ??= (async () => {
    const poToken = await getPoToken()

    return Innertube.create({
      client_type: ClientType.WEB,
      generate_session_locally: true,
      retrieve_player: false,
      cache: new UniversalCache(false),
      ...(poToken ? { po_token: poToken.poToken, visitor_data: poToken.visitorData } : {}),
    })
  })()

  return innertubePromise
}

/** Clears the cached session + PoToken so the next call mints both fresh. */
function resetSession(): void {
  innertubePromise = null
  poTokenPromise = null
  logger.info('Reset cached YouTube InnerTube session and PoToken')
}

/* -------------------------------------------------------------------------- */
/* Player clients — tried in order, first success wins                       */
/* -------------------------------------------------------------------------- */

const PLAYER_CLIENTS = ['ANDROID', 'iOS', 'WEB', 'TV_EMBEDDED', 'MWEB'] as const
type PlayerClient = (typeof PLAYER_CLIENTS)[number]

const CLIENT_USER_AGENT: Record<PlayerClient, string> = {
  ANDROID: 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US) gzip',
  iOS: 'com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_1 like Mac OS X; en_US)',
  WEB: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  TV_EMBEDDED:
    'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
  MWEB:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}

/* -------------------------------------------------------------------------- */
/* Caption track selection + parsing                                         */
/* -------------------------------------------------------------------------- */

interface CaptionTrack {
  baseUrl?: string
  base_url?: string
  languageCode?: string
  language_code?: string
  kind?: string
}

function captionTracksFrom(playerData: unknown): CaptionTrack[] {
  const tracks = (
    playerData as {
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } }
    }
  )?.captions?.playerCaptionsTracklistRenderer?.captionTracks

  return Array.isArray(tracks) ? tracks : []
}

function pickTrack(tracks: CaptionTrack[]): CaptionTrack | undefined {
  return (
    tracks.find((track) => (track.languageCode ?? track.language_code)?.startsWith('en')) ??
    tracks.find((track) => track.kind !== 'asr') ??
    tracks[0]
  )
}

function trackUrl(track: CaptionTrack): string | undefined {
  return track.baseUrl ?? track.base_url
}

function withJson3(base: string): string {
  try {
    const url = new URL(base)
    url.searchParams.set('fmt', 'json3')
    return url.toString()
  } catch {
    const separator = base.includes('?') ? '&' : '?'
    return `${base}${separator}fmt=json3`
  }
}

function parseJson3(body: string): string {
  let data: { events?: { segs?: { utf8?: string }[] }[] }

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

async function downloadCaptions(base: string, client: PlayerClient): Promise<string> {
  const url = withJson3(base)

  const response = await fetch(url, {
    headers: {
      'User-Agent': CLIENT_USER_AGENT[client],
      'Accept-Language': 'en-US,en;q=0.9',
      Origin: 'https://www.youtube.com',
      Referer: 'https://www.youtube.com/',
    },
  })

  if (!response.ok) {
    throw new Error(`Caption download failed with HTTP ${response.status}`)
  }

  const body = await response.text()
  if (!body.trim()) {
    throw new Error('Caption endpoint returned an empty body')
  }

  const text = parseJson3(body)
  if (!text) {
    throw new Error('Caption response could not be parsed into text')
  }

  return decodeEntities(text)
}

/* -------------------------------------------------------------------------- */
/* Single-client attempt                                                     */
/* -------------------------------------------------------------------------- */

async function fetchViaInnerTube(videoId: string, client: PlayerClient): Promise<string> {
  const yt = await getInnertube()

  const player = (await yt.actions.execute('/player', {
    videoId,
    client,
    parse: false,
  } as Record<string, unknown>)) as {
    data?: { playabilityStatus?: { status?: string; reason?: string } } & Record<string, unknown>
  }

  const data = player?.data
  const playability = data?.playabilityStatus?.status
  const reason = data?.playabilityStatus?.reason ?? ''

  if (playability === 'LOGIN_REQUIRED' || /not a bot|sign in to confirm/i.test(reason)) {
    throw new Error(`IP_BLOCKED: YouTube returned LOGIN_REQUIRED (${reason || 'no reason given'})`)
  }

  if (playability && playability !== 'OK' && playability !== 'LIVE_STREAM_OFFLINE') {
    throw new Error(`VIDEO_UNAVAILABLE: YouTube reported this video as ${playability}`)
  }

  const tracks = captionTracksFrom(data)
  if (tracks.length === 0) {
    throw new Error('CAPTIONS_DISABLED: no caption tracks returned')
  }

  const track = pickTrack(tracks)
  const base = track ? trackUrl(track) : undefined
  if (!base) {
    throw new Error('CAPTIONS_DISABLED: caption track had no URL')
  }

  return downloadCaptions(base, client)
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

async function getTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw ApiError.badRequest('Invalid YouTube URL')
  }

  logger.info({ videoId }, 'Starting YouTube transcript extraction (PoToken + InnerTube)')

  const attempts: { client: PlayerClient; error: ReturnType<typeof getErrorDetails> }[] = []
  let sessionWasReset = false

  for (const client of PLAYER_CLIENTS) {
    try {
      const text = await fetchViaInnerTube(videoId, client)
      logger.info({ videoId, client, textLength: text.length }, 'Transcript extracted successfully')
      return { videoId, text }
    } catch (error) {
      const details = getErrorDetails(error)
      attempts.push({ client, error: details })

      logger.warn({ videoId, client, ...details }, 'InnerTube attempt failed')

      // If it looks like a bot/IP block and we haven't already retried with a
      // fresh session this call, reset once and let the loop try again with
      // a brand new PoToken + session on the remaining clients.
      if (!sessionWasReset && /IP_BLOCKED/.test(details.message)) {
        sessionWasReset = true
        resetSession()
      }
    }
  }

  logger.error({ videoId, attempts }, 'All PoToken/InnerTube client attempts failed')

  // Surface the single most useful reason: prefer an explicit block/unavailable
  // signal over a generic "no captions" one, since it tells you what to fix.
  const primary =
    attempts.find((a) => a.error.message.includes('IP_BLOCKED')) ??
    attempts.find((a) => a.error.message.includes('VIDEO_UNAVAILABLE')) ??
    attempts.find((a) => a.error.message.includes('CAPTIONS_DISABLED')) ??
    attempts[0]

  throw new Error(
    `YouTube transcript extraction failed on every client. Most informative reason (${primary.client}): ${primary.error.message}`,
    { cause: primary.error },
  )
}

export const youtubeService = { extractVideoId, getTranscript }