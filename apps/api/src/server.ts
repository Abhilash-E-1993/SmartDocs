import app from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { connectDatabase, disconnectDatabase } from './database/connection'

async function bootstrap(): Promise<void> {
  await connectDatabase()

  const server = app.listen(env.PORT, () => {
    logger.info(`API server running on http://localhost:${env.PORT}`)
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
