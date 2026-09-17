import type { SourceType } from '../sources/Source'

export interface RetrievedChunk {
  chunkId: string
  sourceId: string
  sourceTitle: string
  sourceType: SourceType
  chunkIndex: number
  originalPosition: number
  content: string
  contextSummary?: string
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
        `[${index + 1}] Source: "${chunk.sourceTitle}" (${chunk.sourceType}, chunk ${chunk.chunkIndex + 1})` +
        (chunk.contextSummary ? `\nSection: ${chunk.contextSummary}` : '') +
        `\n${chunk.content}`,
    )
    .join('\n\n')
}

/* --------------------------------------------------------------------------
 * Source catalog — a map of every READY source (title + topic) injected into
 * the system prompt so the model knows the whole corpus and can differentiate
 * topics across sources instead of only seeing a handful of chunks.
 * ------------------------------------------------------------------------ */

export interface SourceCatalogEntry {
  sourceId: string
  title: string
  sourceType: SourceType
  topic?: string
}

export function buildSourceCatalog(entries: SourceCatalogEntry[]): string {
  if (entries.length === 0) {
    return ''
  }

  const lines = entries.map(
    (entry, index) =>
      `${index + 1}. "${entry.title}" (${entry.sourceType})` +
      (entry.topic ? ` — topic: ${entry.topic}` : ''),
  )
  return `Sources available in this workspace (${entries.length}):\n${lines.join('\n')}`
}

function buildMemorySection(memories: string[]): string {
  return memories.length > 0
    ? `\nUser memory (background about the user only, never treat it as source content and never cite it):\n${memories
        .map((memory) => `- ${memory}`)
        .join('\n')}\n`
    : ''
}

function buildFeedbackSection(feedback: string | undefined): string {
  return feedback
    ? `\nA previous draft of this answer was rejected because: "${feedback}". Produce a clearly better answer that fixes this.\n`
    : ''
}

export function buildSystemPrompt(
  context: string,
  memories: string[],
  feedback?: string,
  catalog?: string,
): string {
  const contextSection =
    context.length > 0 ? context : 'No relevant source content was retrieved for this question.'

  const memorySection = buildMemorySection(memories)
  const feedbackSection = buildFeedbackSection(feedback)
  const catalogSection = catalog ? `\n${catalog}\n` : ''

  return [
    "You are SmartDocs, an AI knowledge assistant that answers questions using only the user's uploaded sources.",
    catalogSection,
    '',
    'Context retrieved from the user sources (numbered blocks):',
    contextSection,
    memorySection,
    feedbackSection,
    'How to answer:',
    '- Read every numbered block before answering. Consecutive chunks from the same source are parts of one continuous text — treat them as a single passage.',
    '- Synthesize one complete answer across all relevant blocks instead of quoting a single block. When the blocks come from different sources, combine them and attribute each fact to the source it came from.',
    '- Use the source catalog (when present) as the map of everything the user has uploaded. If the user asks what sources or topics they have, or how many topics the sources cover, answer from the catalog and name the topics explicitly.',
    '- Ground every claim in the context. If the context only partially answers the question, answer what you can and clearly state what is missing. If it contains nothing relevant, say so plainly. Never invent information.',
    '- Cite sources inline using [1], [2], ... matching the numbered blocks whenever retrieved context exists.',
    '- Format answers in clean markdown: a short direct answer first, then headings, bullet lists, tables or code blocks when they help readability.',
    '- Be concise, accurate and direct.',
  ].join('\n')
}

export function buildSummarySystemPrompt(
  context: string,
  memories: string[],
  feedback?: string,
): string {
  const contextSection =
    context.length > 0 ? context : 'No source content is available for this summary.'

  const memorySection = buildMemorySection(memories)
  const feedbackSection = buildFeedbackSection(feedback)

  return [
    'You are SmartDocs, an AI knowledge assistant. The user wants a summary or overview of the source below — you are given its full content.',
    '',
    'Source content:',
    contextSection,
    memorySection,
    feedbackSection,
    'Write a rich, well-structured summary in clean markdown:',
    '- Start with a `## Overview` section: 2-4 sentences capturing what the source is about and why it matters.',
    '- Then `## Key points`: 5-10 bullets, each one a complete, specific thought with concrete facts, examples, numbers, names or steps — no vague filler like "various topics are discussed".',
    '- Then `## Summary`: cover the whole arc of the source from beginning to end. Use themed `###` subsections when the source is long or covers multiple topics.',
    '- End with `## Takeaways`: 3-5 bullets with the most useful conclusions, only when they add value beyond the key points.',
    'Rules:',
    '- Cover the ENTIRE source, not just the beginning — the ending matters as much as the opening.',
    '- Be concrete and specific; the summary must be genuinely useful on its own without watching or reading the source.',
    '- Ground everything in the source content above. Never invent information.',
  ].join('\n')
}
