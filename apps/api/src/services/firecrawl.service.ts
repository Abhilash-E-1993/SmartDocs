import Firecrawl from '@mendable/firecrawl-js'

import { env } from '../config/env'
import { ApiError } from '../utils/api-error'

interface ScrapedPage {
  markdown: string
  title: string | null
}

async function scrapeToMarkdown(url: string): Promise<ScrapedPage> {
  if (!env.FIRECRAWL_API_KEY) {
    throw ApiError.serviceUnavailable('Website extraction is not configured')
  }

  const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY })
  const document = await firecrawl.scrape(url, { formats: ['markdown'] })

  if (!document.markdown) {
    throw new Error('No content could be extracted from this page')
  }

  return { markdown: document.markdown, title: document.metadata?.title ?? null }
}

export const firecrawlService = { scrapeToMarkdown }
