import { sourceService } from '../modules/sources/service'
import { firecrawlService } from '../services/firecrawl.service'
import { normalizeText } from '../utils/clean-text'
import { inngest } from './client'
import {
  completeSource,
  failSourceFromEvent,
  indexSource,
  type SourceProcessEventData,
} from './steps'

export const processWebsiteJob = inngest.createFunction(
  {
    id: 'process-website-source',
    retries: 2,
    triggers: [{ event: 'sources/website.process' }],
    onFailure: async ({ event, error }: { event: unknown; error: Error }) => {
      await failSourceFromEvent(event, error)
    },
  },
  async ({ event, step }) => {
    const { sourceId } = event.data as SourceProcessEventData

    await step.run('mark-processing', () => sourceService.markProcessing(sourceId))

    const cleaned = await step.run('extract-and-clean', async () => {
      const source = await sourceService.getById(sourceId)
      const url = source.metadata.url
      if (!url) {
        throw new Error('The website URL is missing')
      }

      const { markdown } = await firecrawlService.scrapeToMarkdown(url)
      return normalizeText(markdown)
    })

    await step.run('index', () => indexSource(sourceId, cleaned))

    return step.run('mark-ready', () => completeSource(sourceId))
  },
)
