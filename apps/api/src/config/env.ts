import dotenv from 'dotenv'

dotenv.config({ quiet: true })

interface Env {
  NODE_ENV: string
  PORT: number
  CLIENT_URL: string
  MONGODB_URI: string | undefined
  CLERK_SECRET_KEY: string | undefined
  CLERK_PUBLISHABLE_KEY: string | undefined
  CLOUDINARY_CLOUD_NAME: string | undefined
  CLOUDINARY_API_KEY: string | undefined
  CLOUDINARY_API_SECRET: string | undefined
  FIRECRAWL_API_KEY: string | undefined
  OPENAI_API_KEY: string | undefined
  OPENAI_CHAT_MODEL: string
  PINECONE_API_KEY: string | undefined
  PINECONE_INDEX_NAME: string
  MEM0_API_KEY: string | undefined
}

export const env: Env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME ?? 'smartdocs',
  MEM0_API_KEY: process.env.MEM0_API_KEY,
}
