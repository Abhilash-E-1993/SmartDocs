import cors from 'cors'
import express, { type Express } from 'express'
import pinoHttp from 'pino-http'

import { env } from './config/env'
import { logger } from './config/logger'
import { clerkSession } from './middleware/auth.middleware'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import { authRouter } from './modules/auth/routes'
import { healthRouter } from './modules/health/routes'
import { workspaceRouter } from './modules/workspace/routes'

const app: Express = express()

app.use(pinoHttp({ logger }))
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(clerkSession)

app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/workspaces', workspaceRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
