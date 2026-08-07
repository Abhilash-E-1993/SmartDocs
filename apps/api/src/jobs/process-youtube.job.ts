import { sourceService } from '../modules/sources/service'
import { youtubeService } from '../services/youtube.service'
import { normalizeText } from '../utils/clean-text'
import { inngest } from './client'
import {
  completeSource,
  failSourceFromEvent,
  indexSource,
  type SourceProcessEventData,
} from './steps'

export const processYoutubeJob = inngest.createFunction(
  {
    id: 'process-youtube-source',
    retries: 2,
    triggers: [{ event: 'sources/youtube.process' }],
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
        throw new Error('The YouTube URL is missing')
      }

      const { text } = await youtubeService.getTranscript(url)
      return normalizeText(text)
    })

    await step.run('index', () => indexSource(sourceId, cleaned))

    return step.run('mark-ready', () => completeSource(sourceId))
  },
)
