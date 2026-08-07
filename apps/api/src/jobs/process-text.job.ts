import { sourceService } from '../modules/sources/service'
import { normalizeText } from '../utils/clean-text'
import { inngest } from './client'
import {
  completeSource,
  failSourceFromEvent,
  indexSource,
  type SourceProcessEventData,
} from './steps'

export const processTextJob = inngest.createFunction(
  {
    id: 'process-text-source',
    retries: 2,
    triggers: [{ event: 'sources/text.process' }],
    onFailure: async ({ event, error }: { event: unknown; error: Error }) => {
      await failSourceFromEvent(event, error)
    },
  },
  async ({ event, step }) => {
    const { sourceId } = event.data as SourceProcessEventData

    await step.run('mark-processing', () => sourceService.markProcessing(sourceId))

    const cleaned = await step.run('normalize', async () => {
      const source = await sourceService.getById(sourceId)
      return normalizeText(source.rawContent ?? '')
    })

    await step.run('index', () => indexSource(sourceId, cleaned))

    return step.run('mark-ready', () => completeSource(sourceId))
  },
)
