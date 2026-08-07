import { Router } from 'express'

import { attachUser, requireAuth } from '../../middleware/auth.middleware'
import { asyncHandler } from '../../utils/async-handler'
import { authController } from './controller'

export const authRouter = Router()

authRouter.get('/me', requireAuth, attachUser, asyncHandler(authController.getMe))
