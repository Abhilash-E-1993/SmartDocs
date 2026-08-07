import type { Request, Response } from 'express'

import { ApiError } from '../../utils/api-error'
import { sendOk } from '../../utils/api-response'
import { toUserResponse } from './types'

export const authController = {
  async getMe(req: Request, res: Response): Promise<void> {
    const user = req.user
    if (!user) {
      throw ApiError.unauthorized()
    }

    sendOk(res, toUserResponse(user))
  },
}
