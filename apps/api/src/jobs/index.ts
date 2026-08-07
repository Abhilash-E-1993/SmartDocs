import { processPdfJob } from './process-pdf.job'
import { processTextJob } from './process-text.job'
import { processWebsiteJob } from './process-website.job'
import { processYoutubeJob } from './process-youtube.job'

export const inngestFunctions = [
  processPdfJob,
  processWebsiteJob,
  processYoutubeJob,
  processTextJob,
]
