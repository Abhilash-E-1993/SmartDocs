import type { NextFunction, Request, Response } from 'express'
import { MongooseError } from 'mongoose'
import { ZodError } from 'zod'

import { logger } from '../config/logger'
import { ApiError, isDuplicateKeyError } from '../utils/api-error'

interface ErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ErrorBody = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  }
  res.status(statusCode).json(body)
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`)
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    sendError(res, error.statusCode, error.code, error.message, error.details)
    return
  }

  if (error instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request data', error.issues)
    return
  }

  if (isDuplicateKeyError(error)) {
    sendError(res, 409, 'CONFLICT', 'Resource already exists')
    return
  }

  if (error instanceof MongooseError) {
    if (error.name === 'CastError') {
      sendError(res, 400, 'INVALID_ID', 'Invalid resource identifier')
      return
    }

    logger.error({ err: error, path: req.path }, 'Database error')
    sendError(res, 500, 'DATABASE_ERROR', 'A database error occurred')
    return
  }

  if (error instanceof SyntaxError && 'body' in error) {
    sendError(res, 400, 'INVALID_JSON', 'Request body contains invalid JSON')
    return
  }

  logger.error({ err: error, method: req.method, path: req.path }, 'Unhandled error')
  sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong')
}
