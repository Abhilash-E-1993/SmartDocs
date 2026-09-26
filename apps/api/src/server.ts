import app from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { connectDatabase, disconnectDatabase } from './database/connection'
import { pdfService } from './services/pdf.service'
import { pineconeService } from './services/pinecone.service'

async function bootstrap(): Promise<void> {
  await connectDatabase()

  const server = app.listen(env.PORT, () => {
    logger.info(`API server running on http://localhost:${env.PORT}`)

    // Pre-warm the lazily-initialized processing stack (pdf.js engine,
    // Pinecone index connection) so the first source upload after a cold
    // start does not pay the initialization cost inside the user's request.
    // Fire-and-forget: never blocks startup and never crashes the server.
    void Promise.allSettled([pdfService.warmup(), pineconeService.warmup()]).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected')
      if (failed.length > 0) {
        logger.warn({ failures: failed.length }, 'Processing warmup completed with failures')
      } else {
        logger.info('Processing services warmed up (pdf engine, vector index)')
      }
    })
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down')
    server.close()
    await disconnectDatabase()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

void bootstrap()
