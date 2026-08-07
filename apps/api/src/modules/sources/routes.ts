import { Router } from 'express'

import { attachUser, requireAuth } from '../../middleware/auth.middleware'
import { pdfUpload } from '../../middleware/upload.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { objectIdParamSchema } from '../../validators/workspace.validator'
import {
  createTextSourceSchema,
  createUrlSourceSchema,
  renameSourceSchema,
  workspaceIdParamSchema,
} from '../../validators/source.validator'
import { sourceController } from './controller'

export const workspaceSourcesRouter = Router({ mergeParams: true })

workspaceSourcesRouter.use(requireAuth, attachUser)

workspaceSourcesRouter.get(
  '/',
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(sourceController.list),
)
workspaceSourcesRouter.post(
  '/pdf',
  validate({ params: workspaceIdParamSchema }),
  pdfUpload,
  asyncHandler(sourceController.uploadPdf),
)
workspaceSourcesRouter.post(
  '/text',
  validate({ params: workspaceIdParamSchema, body: createTextSourceSchema }),
  asyncHandler(sourceController.createText),
)
workspaceSourcesRouter.post(
  '/website',
  validate({ params: workspaceIdParamSchema, body: createUrlSourceSchema }),
  asyncHandler(sourceController.createWebsite),
)
workspaceSourcesRouter.post(
  '/youtube',
  validate({ params: workspaceIdParamSchema, body: createUrlSourceSchema }),
  asyncHandler(sourceController.createYoutube),
)

export const sourcesRouter = Router()

sourcesRouter.use(requireAuth, attachUser)

sourcesRouter.get(
  '/:id',
  validate({ params: objectIdParamSchema }),
  asyncHandler(sourceController.getById),
)
sourcesRouter.patch(
  '/:id',
  validate({ params: objectIdParamSchema, body: renameSourceSchema }),
  asyncHandler(sourceController.rename),
)
sourcesRouter.delete(
  '/:id',
  validate({ params: objectIdParamSchema }),
  asyncHandler(sourceController.remove),
)
sourcesRouter.post(
  '/:id/retry',
  validate({ params: objectIdParamSchema }),
  asyncHandler(sourceController.retry),
)
