import mongoose from 'mongoose'

import { env } from '../config/env'
import { logger } from '../config/logger'

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set — database features are disabled')
    return
  }

  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    logger.info('MongoDB connected')
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed')
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}

export async function disconnectDatabase(): Promise<void> {
  if (isDatabaseConnected()) {
    await mongoose.disconnect()
  }
}
