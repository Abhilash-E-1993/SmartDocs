import { env } from './env'

function isValidPublishableKey(key: string): boolean {
  const match = /^pk_(test|live)_([A-Za-z0-9+/=]+)$/.exec(key)
  if (!match) {
    return false
  }

  try {
    return Buffer.from(match[2], 'base64').toString('utf8').endsWith('$')
  } catch {
    return false
  }
}

function isValidSecretKey(key: string): boolean {
  return /^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(key)
}

export const clerkKeys = {
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
} as const

export const isClerkConfigured = Boolean(
  env.CLERK_SECRET_KEY &&
  env.CLERK_PUBLISHABLE_KEY &&
  isValidSecretKey(env.CLERK_SECRET_KEY) &&
  isValidPublishableKey(env.CLERK_PUBLISHABLE_KEY),
)
