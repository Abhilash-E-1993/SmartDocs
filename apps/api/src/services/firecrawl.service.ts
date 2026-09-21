import { JSDOM } from 'jsdom'
import Firecrawl from '@mendable/firecrawl-js'

import { env } from '../config/env'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'
import { withRetry } from '../utils/retry'

interface ScrapedPage {
  markdown: string
  title: string | null
}

// ─── Provider 1: Firecrawl ───────────────────────────────────────────────────

async function fetchFromFirecrawl(url: string): Promise<ScrapedPage> {
  if (!env.FIRECRAWL_API_KEY) {
    throw ApiError.serviceUnavailable('Website extraction is not configured (no FIRECRAWL_API_KEY)')
  }

  const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY })
  // Transient scrape failures (rate limit, network) are retried with backoff.
  const document = await withRetry(() => firecrawl.scrape(url, { formats: ['markdown'] }), {
    attempts: 3,
    label: 'firecrawl-scrape',
  })

  if (!document.markdown) {
    throw new Error('Firecrawl returned no markdown content for this page')
  }

  return { markdown: document.markdown, title: document.metadata?.title ?? null }
}

// ─── Provider 2: Direct fetch + jsdom text extraction (fallback) ──────────────

function htmlToMarkdown(html: string, baseUrl: string): { markdown: string; title: string | null } {
  const dom = new JSDOM(html, { url: baseUrl })
  const doc = dom.window.document

  const title = doc.querySelector('title')?.textContent?.trim() ?? null

  // Remove noise: scripts, styles, nav, footer, ads
  const NOISE_SELECTORS = [
    'script', 'style', 'noscript', 'iframe', 'nav', 'footer', 'header',
    'aside', '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '.advertisement', '.ads', '.sidebar', '.cookie', '.popup', '.modal',
  ]
  for (const sel of NOISE_SELECTORS) {
    for (const el of Array.from(doc.querySelectorAll(sel))) {
      el.remove()
    }
  }

  // Try to find the main content container
  const mainEl =
    doc.querySelector('main') ??
    doc.querySelector('article') ??
    doc.querySelector('[role="main"]') ??
    doc.querySelector('.content') ??
    doc.querySelector('#content') ??
    doc.body

  // Extract text with basic markdown-ish formatting
  const lines: string[] = []

  function walk(node: Element): void {
    const tag = node.tagName?.toLowerCase()
    if (!tag) return

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const level = parseInt(tag[1], 10)
      const text = node.textContent?.trim()
      if (text) {
        lines.push(`${'#'.repeat(level)} ${text}`)
        lines.push('')
      }
      return
    }

    if (tag === 'p') {
      const text = node.textContent?.trim()
      if (text) {
        lines.push(text)
        lines.push('')
      }
      return
    }

    if (tag === 'li') {
      const text = node.textContent?.trim()
      if (text) {
        lines.push(`- ${text}`)
      }
      return
    }

    if (tag === 'br') {
      lines.push('')
      return
    }

    // Recurse into other elements
    for (const child of Array.from(node.children)) {
      walk(child as Element)
    }
  }

  if (mainEl) {
    walk(mainEl as Element)
  }

  const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  if (!markdown || markdown.length < 50) {
    // Final fallback: grab all text
    const rawText = (mainEl?.textContent ?? doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim()
    return { markdown: rawText, title }
  }

  return { markdown, title }
}

async function fetchFromDirect(url: string): Promise<ScrapedPage> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SmartDocs/1.0; +https://smartdocs.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Direct fetch failed with HTTP ${response.status}: ${url}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    throw new Error(`URL does not point to an HTML page (Content-Type: ${contentType})`)
  }

  const html = await response.text()
  const { markdown, title } = htmlToMarkdown(html, url)

  if (!markdown || markdown.length < 50) {
    throw new Error('Not enough text content could be extracted from this page')
  }

  return { markdown, title }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function scrapeToMarkdown(url: string): Promise<ScrapedPage> {
  // Try Firecrawl first (best quality), fall back to direct fetch
  if (env.FIRECRAWL_API_KEY) {
    try {
      return await fetchFromFirecrawl(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn(
        { url, error: message },
        'Firecrawl failed — falling back to direct HTML extraction',
      )
    }
  } else {
    logger.info({ url }, 'No FIRECRAWL_API_KEY — using direct HTML extraction')
  }

  // Fallback: direct fetch + jsdom
  try {
    return await withRetry(() => fetchFromDirect(url), {
      attempts: 2,
      label: 'direct-html-scrape',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not extract content from this website: ${message}`)
  }
}

export const firecrawlService = { scrapeToMarkdown }
