import dotenv from 'dotenv'

dotenv.config({ quiet: true })

interface Env {
  NODE_ENV: string
  PORT: number
  CLIENT_URL: string
  MONGODB_URI: string | undefined
  CLERK_SECRET_KEY: string | undefined
  CLERK_PUBLISHABLE_KEY: string | undefined
}

export const env: Env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
}
