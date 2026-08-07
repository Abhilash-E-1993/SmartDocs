import { sourceService } from '../modules/sources/service'
import { cloudinaryService } from '../services/cloudinary.service'
import { pdfService } from '../services/pdf.service'
import { normalizeText } from '../utils/clean-text'
import { inngest } from './client'
import {
  completeSource,
  failSourceFromEvent,
  indexSource,
  type SourceProcessEventData,
} from './steps'

export const processPdfJob = inngest.createFunction(
  {
    id: 'process-pdf-source',
    retries: 2,
    triggers: [{ event: 'sources/pdf.process' }],
    onFailure: async ({ event, error }: { event: unknown; error: Error }) => {
      await failSourceFromEvent(event, error)
    },
  },
  async ({ event, step }) => {
    const { sourceId } = event.data as SourceProcessEventData

    await step.run('mark-processing', () => sourceService.markProcessing(sourceId))

    const cleaned = await step.run('extract-and-clean', async () => {
      const source = await sourceService.getById(sourceId)
      if (!source.cloudinaryUrl) {
        throw new Error('The uploaded PDF file is missing')
      }

      const buffer = await cloudinaryService.downloadPdf(source.cloudinaryUrl)
      const { text, pageCount } = await pdfService.extractText(buffer)
      await sourceService.setExtractedMetadata(sourceId, { pageCount })
      return normalizeText(text)
    })

    await step.run('index', () => indexSource(sourceId, cleaned))

    return step.run('mark-ready', () => completeSource(sourceId))
  },
)
