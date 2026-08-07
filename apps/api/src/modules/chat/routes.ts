import { Router } from 'express'

import { attachUser, requireAuth } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/async-handler'
import {
  chatIdParamSchema,
  createChatSchema,
  renameChatSchema,
  sendMessageSchema,
  streamQuerySchema,
} from '../../validators/chat.validator'
import { workspaceIdParamSchema } from '../../validators/source.validator'
import { chatController } from './controller'

export const workspaceChatsRouter = Router({ mergeParams: true })

workspaceChatsRouter.use(requireAuth, attachUser)

workspaceChatsRouter.get(
  '/',
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(chatController.list),
)
workspaceChatsRouter.post(
  '/',
  validate({ params: workspaceIdParamSchema, body: createChatSchema }),
  asyncHandler(chatController.create),
)

export const chatsRouter = Router()

chatsRouter.use(requireAuth, attachUser)

chatsRouter.get(
  '/:id',
  validate({ params: chatIdParamSchema }),
  asyncHandler(chatController.getById),
)
chatsRouter.get(
  '/:id/messages',
  validate({ params: chatIdParamSchema }),
  asyncHandler(chatController.listMessages),
)
chatsRouter.post(
  '/:id/messages',
  validate({ params: chatIdParamSchema, body: sendMessageSchema, query: streamQuerySchema }),
  asyncHandler(chatController.streamMessage),
)
chatsRouter.patch(
  '/:id',
  validate({ params: chatIdParamSchema, body: renameChatSchema }),
  asyncHandler(chatController.rename),
)
chatsRouter.delete(
  '/:id',
  validate({ params: chatIdParamSchema }),
  asyncHandler(chatController.remove),
)
