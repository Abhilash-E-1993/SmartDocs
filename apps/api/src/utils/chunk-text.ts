export interface TextChunk {
  chunkIndex: number
  startOffset: number
  content: string
}

const DEFAULT_MAX_CHARS = 1000
const DEFAULT_OVERLAP = 150

function findBreakPoint(windowText: string, minBreak: number): number {
  const paragraphBreak = windowText.lastIndexOf('\n\n')
  if (paragraphBreak > minBreak) {
    return paragraphBreak + 2
  }

  const sentenceBreak = Math.max(
    windowText.lastIndexOf('. '),
    windowText.lastIndexOf('! '),
    windowText.lastIndexOf('? '),
    windowText.lastIndexOf('.\n'),
  )
  if (sentenceBreak > minBreak) {
    return sentenceBreak + 1
  }

  const wordBreak = windowText.lastIndexOf(' ')
  if (wordBreak > minBreak) {
    return wordBreak + 1
  }

  return -1
}

export function chunkText(
  text: string,
  maxChars = DEFAULT_MAX_CHARS,
  overlap = DEFAULT_OVERLAP,
): TextChunk[] {
  const normalized = text.trim()
  if (!normalized) {
    return []
  }

  const chunks: TextChunk[] = []
  let start = 0

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length)

    if (end < normalized.length) {
      const breakPoint = findBreakPoint(normalized.slice(start, end), Math.floor(maxChars * 0.5))
      if (breakPoint > 0) {
        end = start + breakPoint
      }
    }

    const content = normalized.slice(start, end).trim()
    if (content) {
      chunks.push({ chunkIndex: chunks.length, startOffset: start, content })
    }

    const nextStart = end - overlap
    start = nextStart > start ? nextStart : end
  }

  return chunks
}
