import type { UserDocument } from '../modules/auth/User'

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument
    }
  }
}

export {}
