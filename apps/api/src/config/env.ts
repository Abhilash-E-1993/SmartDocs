import dotenv from 'dotenv'

dotenv.config({ quiet: true })

interface Env {
  NODE_ENV: string
  PORT: number
  CLIENT_URL: string
  CLIENT_URLS: string[]
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
  /** Optional HTTP proxy used only for YouTube transcript calls (bypasses datacenter IP blocks). */
  YOUTUBE_PROXY_URL: string | undefined
}

// Comma-separated list of frontend origins allowed by CORS
// (e.g. "https://app.vercel.app,https://smartdocshub.online" in production).
const rawClientUrls = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

const clientUrlsSet = new Set<string>(rawClientUrls)
for (const rawUrl of rawClientUrls) {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4)
      clientUrlsSet.add(parsed.origin)
    } else if (
      parsed.hostname.includes('.') &&
      !parsed.hostname.startsWith('localhost') &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)
    ) {
      parsed.hostname = `www.${parsed.hostname}`
      clientUrlsSet.add(parsed.origin)
    }
  } catch {
    // Ignore invalid URL
  }
}
const clientUrls = Array.from(clientUrlsSet)


export const env: Env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  CLIENT_URL: clientUrls[0] ?? 'http://localhost:5173',
  CLIENT_URLS: clientUrls,
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
  YOUTUBE_PROXY_URL: process.env.YOUTUBE_PROXY_URL,
}
