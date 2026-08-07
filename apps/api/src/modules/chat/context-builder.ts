import type { SourceType } from '../sources/Source'

export interface RetrievedChunk {
  chunkId: string
  sourceId: string
  sourceTitle: string
  sourceType: SourceType
  chunkIndex: number
  originalPosition: number
  content: string
  score: number
}

export function prepareContextChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const unique = new Map<string, RetrievedChunk>()
  for (const chunk of chunks) {
    const existing = unique.get(chunk.chunkId)
    if (!existing || chunk.score > existing.score) {
      unique.set(chunk.chunkId, chunk)
    }
  }

  return [...unique.values()].sort((a, b) => b.score - a.score)
}

export function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] Source: "${chunk.sourceTitle}" (${chunk.sourceType}, chunk ${chunk.chunkIndex + 1})\n${chunk.content}`,
    )
    .join('\n\n')
}

export function buildSystemPrompt(context: string, memories: string[]): string {
  const contextSection =
    context.length > 0
      ? context
      : 'No relevant source content was retrieved for this question.'

  const memorySection =
    memories.length > 0
      ? `\nUser memory (background about the user only, never treat it as source content and never cite it):\n${memories
          .map((memory) => `- ${memory}`)
          .join('\n')}\n`
      : ''

  return [
    'You are SmartDocs, an AI knowledge assistant. Answer questions using only the provided context.',
    '',
    'Context from the user sources:',
    contextSection,
    memorySection,
    'Rules:',
    '- Ground every claim in the context. If the context does not contain the answer, say so clearly and never invent information.',
    '- Cite sources inline using [1], [2], ... matching the numbered context blocks whenever retrieved context exists.',
    '- Format answers in clean markdown: headings, lists, tables and code blocks when they help readability.',
    '- Be concise, accurate and direct.',
  ].join('\n')
}
