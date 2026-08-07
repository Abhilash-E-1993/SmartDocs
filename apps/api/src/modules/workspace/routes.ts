import { Router } from 'express'

import { attachUser, requireAuth } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { objectIdParamSchema, workspaceNameSchema } from '../../validators/workspace.validator'
import { workspaceController } from './controller'

export const workspaceRouter = Router()

workspaceRouter.use(requireAuth, attachUser)

workspaceRouter.get('/', asyncHandler(workspaceController.list))
workspaceRouter.post(
  '/',
  validate({ body: workspaceNameSchema }),
  asyncHandler(workspaceController.create),
)
workspaceRouter.get(
  '/:id',
  validate({ params: objectIdParamSchema }),
  asyncHandler(workspaceController.getById),
)
workspaceRouter.patch(
  '/:id',
  validate({ params: objectIdParamSchema, body: workspaceNameSchema }),
  asyncHandler(workspaceController.rename),
)
workspaceRouter.delete(
  '/:id',
  validate({ params: objectIdParamSchema }),
  asyncHandler(workspaceController.remove),
)
