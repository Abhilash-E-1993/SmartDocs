import { sourceService } from '../modules/sources/service'
import { normalizeText } from '../utils/clean-text'
import { inngest } from './client'
import {
  completeSource,
  failSourceFromEvent,
  labelSource,
  prepareSourceChunks,
  vectorizeSource,
  type SourceProcessEventData,
} from './steps'

export const processTextJob = inngest.createFunction(
  {
    id: 'process-text-source',
    retries: 3,
    // Cap simultaneous runs so burst uploads cannot trigger OpenAI/Pinecone rate limits.
    concurrency: { limit: 3 },
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

    // Indexing is split into durable steps — a failed run resumes at the
    // failed step instead of redoing the whole (possibly long) pipeline.
    await step.run('index-chunks', () => prepareSourceChunks(sourceId, cleaned))
    await step.run('index-vectors', () => vectorizeSource(sourceId))
    await step.run('label-topic', () => labelSource(sourceId, cleaned))

    return step.run('mark-ready', () => completeSource(sourceId))
  },
)
