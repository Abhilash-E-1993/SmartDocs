import { Router } from 'express'

import { asyncHandler } from '../../utils/async-handler'
import { healthController } from './controller'

export const healthRouter = Router()

healthRouter.get('/', asyncHandler(healthController.getHealth))
