import type { Request, Response } from 'express'

import { logger } from '../../config/logger'
import { ApiError } from '../../utils/api-error'
import { sendCreated, sendOk } from '../../utils/api-response'
import type {
  CreateChatInput,
  RenameChatInput,
  SendMessageInput,
} from '../../validators/chat.validator'
import { ragService } from './rag.service'
import { chatService } from './service'
import { toChatResponse, toMessageResponse, type ChatResponse, type ChatStreamEvent } from './types'

function getOwnerId(req: Request): string {
  const user = req.user
  if (!user) {
    throw ApiError.unauthorized()
  }

  return user._id.toString()
}

function getParamId(req: Request): string {
  const { id } = req.params
  return Array.isArray(id) ? id[0] : id
}

function getWorkspaceId(req: Request): string {
  const { workspaceId } = req.params
  return Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
}

function getTopK(req: Request): number | undefined {
  const { topK } = req.query as { topK?: number }
  return topK
}

export const chatController = {
  async list(req: Request, res: Response): Promise<void> {
    const chats = await chatService.listByWorkspace(getWorkspaceId(req), getOwnerId(req))
    const data: ChatResponse[] = chats.map(toChatResponse)
    sendOk(res, data)
  },

  async create(req: Request, res: Response): Promise<void> {
    const { title } = req.body as CreateChatInput
    const chat = await chatService.createForOwner(getWorkspaceId(req), getOwnerId(req), title)
    sendCreated(res, toChatResponse(chat))
  },

  async getById(req: Request, res: Response): Promise<void> {
    const chat = await chatService.getByIdForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, toChatResponse(chat))
  },

  async listMessages(req: Request, res: Response): Promise<void> {
    const messages = await chatService.listMessages(getParamId(req), getOwnerId(req))
    sendOk(res, messages.map(toMessageResponse))
  },

  async rename(req: Request, res: Response): Promise<void> {
    const { title } = req.body as RenameChatInput
    const chat = await chatService.renameForOwner(getParamId(req), getOwnerId(req), title)
    sendOk(res, toChatResponse(chat))
  },

  async remove(req: Request, res: Response): Promise<void> {
    await chatService.deleteForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, { id: getParamId(req) })
  },

  async streamMessage(req: Request, res: Response): Promise<void> {
    const chatId = getParamId(req)
    const ownerId = getOwnerId(req)
    const { content } = req.body as SendMessageInput
    const topK = getTopK(req)

    const chat = await chatService.getByIdForOwner(chatId, ownerId)

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()

    const abort = new AbortController()
    req.on('close', () => {
      abort.abort()
    })

    const emit = (event: ChatStreamEvent): void => {
      if (!res.writableEnded) {
        res.write(`${JSON.stringify(event)}\n`)
      }
    }

    try {
      await ragService.answerQuestion({
        chat,
        ownerId,
        question: content,
        topK,
        emit,
        signal: abort.signal,
      })
    } catch (error) {
      if (!abort.signal.aborted) {
        logger.error({ err: error, chatId }, 'Chat answer pipeline failed')
        emit({
          type: 'error',
          message: error instanceof ApiError ? error.message : 'Failed to generate an answer',
        })
      }
    } finally {
      res.end()
    }
  },
}
