export interface TextChunk {
  content: string
  index: number
  metadata: Record<string, unknown>
}

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

export function chunkText(text: string, metadata: Record<string, unknown> = {}): TextChunk[] {
  const sentences = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split(/(?<=[。．.!?！？\n])\s*/)
    .filter(s => s.trim().length > 0)

  const chunks: TextChunk[] = []
  let currentChunk = ''
  let chunkIndex = 0

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        metadata,
      })
      const words = currentChunk.split(/\s+/)
      currentChunk = words.slice(-CHUNK_OVERLAP).join(' ') + ' ' + sentence
    } else {
      currentChunk += sentence
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata,
    })
  }

  return chunks
}
