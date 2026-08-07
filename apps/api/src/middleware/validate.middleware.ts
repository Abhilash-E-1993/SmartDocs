import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

interface RequestSchemas {
  body?: ZodType
  params?: ZodType
  query?: ZodType
}

export function validate(schemas: RequestSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body)
      }

      if (schemas.params) {
        Object.assign(req.params, await schemas.params.parseAsync(req.params))
      }

      if (schemas.query) {
        Object.assign(req.query, await schemas.query.parseAsync(req.query))
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
