import cors from 'cors'
import express, { type Express } from 'express'
import { serve } from 'inngest/express'
import pinoHttp from 'pino-http'

import { env } from './config/env'
import { logger } from './config/logger'
import { inngestFunctions } from './jobs'
import { inngest } from './jobs/client'
import { clerkSession } from './middleware/auth.middleware'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import { authRouter } from './modules/auth/routes'
import { chatsRouter, workspaceChatsRouter } from './modules/chat/routes'
import { healthRouter } from './modules/health/routes'
import { sourcesRouter, workspaceSourcesRouter } from './modules/sources/routes'
import { workspaceRouter } from './modules/workspace/routes'

const app: Express = express()

app.use(pinoHttp({ logger }))
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(clerkSession)

app.use('/api/inngest', serve({ client: inngest, functions: inngestFunctions }))

app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/workspaces/:workspaceId/sources', workspaceSourcesRouter)
app.use('/workspaces/:workspaceId/chats', workspaceChatsRouter)
app.use('/workspaces', workspaceRouter)
app.use('/sources', sourcesRouter)
app.use('/chats', chatsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
