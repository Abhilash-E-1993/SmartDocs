import { clerkMiddleware, getAuth } from '@clerk/express'
import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { clerkKeys, isClerkConfigured } from '../config/clerk'
import { isDatabaseConnected } from '../database/connection'
import { authService } from '../modules/auth/service'
import { ApiError } from '../utils/api-error'
import { asyncHandler } from '../utils/async-handler'

function mapClerkError(error: unknown): unknown {
  if (error instanceof Error && /key/i.test(error.message)) {
    return ApiError.serviceUnavailable('Authentication is misconfigured')
  }

  return error
}

const verifyClerkRequest = isClerkConfigured
  ? clerkMiddleware({
      secretKey: clerkKeys.secretKey,
      publishableKey: clerkKeys.publishableKey,
    })
  : null

export const clerkSession: RequestHandler = verifyClerkRequest
  ? (req, res, next) => {
      verifyClerkRequest(req, res, (err?: unknown) => {
        next(err ? mapClerkError(err) : undefined)
      })
    }
  : (_req: Request, _res: Response, next: NextFunction): void => next()

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!isClerkConfigured) {
    next(ApiError.serviceUnavailable('Authentication is not configured'))
    return
  }

  if (!getAuth(req).isAuthenticated) {
    next(ApiError.unauthorized())
    return
  }

  next()
}

export const attachUser = asyncHandler(async (req, _res, next) => {
  if (!isDatabaseConnected()) {
    throw ApiError.serviceUnavailable('Database is not available')
  }

  const clerkId = getAuth(req).userId
  if (!clerkId) {
    throw ApiError.unauthorized()
  }

  req.user = await authService.findOrCreateByClerkId(clerkId)
  next()
})
