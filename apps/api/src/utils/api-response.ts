import type { Response } from 'express'

interface SuccessBody<T> {
  success: true
  data: T
}

export function sendOk<T>(res: Response, data: T): void {
  const body: SuccessBody<T> = { success: true, data }
  res.status(200).json(body)
}

export function sendCreated<T>(res: Response, data: T): void {
  const body: SuccessBody<T> = { success: true, data }
  res.status(201).json(body)
}
