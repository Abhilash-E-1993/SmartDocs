import MemoryClient from 'mem0ai'

import { env } from '../config/env'
import { logger } from '../config/logger'

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

const MEMORY_SEARCH_LIMIT = 5

let client: MemoryClient | null = null

export function isMemoryConfigured(): boolean {
  return Boolean(env.MEM0_API_KEY)
}

function getClient(): MemoryClient | null {
  if (!env.MEM0_API_KEY) {
    return null
  }

  if (!client) {
    client = new MemoryClient({ apiKey: env.MEM0_API_KEY })
  }

  return client
}

async function searchMemories(userId: string, query: string): Promise<string[]> {
  const mem0 = getClient()
  if (!mem0) {
    return []
  }

  try {
    const response = await mem0.search(query, {
      filters: { user_id: userId },
      topK: MEMORY_SEARCH_LIMIT,
    })

    return response.results
      .map((result) => result.memory)
      .filter((memory): memory is string => typeof memory === 'string' && memory.length > 0)
  } catch (error) {
    logger.warn({ err: error, userId }, 'Mem0 memory search failed')
    return []
  }
}

async function addConversation(userId: string, turns: ConversationTurn[]): Promise<void> {
  const mem0 = getClient()
  if (!mem0 || turns.length === 0) {
    return
  }

  try {
    await mem0.add(
      turns.map((turn) => ({ role: turn.role, content: turn.content })),
      { userId },
    )
  } catch (error) {
    logger.warn({ err: error, userId }, 'Mem0 memory write failed')
  }
}

export const mem0Service = { isMemoryConfigured, searchMemories, addConversation }
