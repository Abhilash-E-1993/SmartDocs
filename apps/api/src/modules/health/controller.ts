import type { Request, Response } from 'express'

import { isDatabaseConnected } from '../../database/connection'
import { sendOk } from '../../utils/api-response'

interface HealthResponse {
  status: 'ok'
  uptime: number
  timestamp: string
  database: 'connected' | 'disconnected'
}

export const healthController = {
  async getHealth(_req: Request, res: Response): Promise<void> {
    const body: HealthResponse = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: isDatabaseConnected() ? 'connected' : 'disconnected',
    }

    sendOk(res, body)
  },
}
