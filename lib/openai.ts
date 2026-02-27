import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

// Keep getOpenAI as a stub so existing imports don't break
export function getOpenAI() {
  return getGroq() as unknown as import('openai').default
}

// Local embedding using @xenova/transformers (no API key needed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _embedder: any = null

async function getEmbedder() {
  if (!_embedder) {
    const { pipeline } = await import('@xenova/transformers')
    _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _embedder as (texts: string[], options?: Record<string, unknown>) => Promise<{ data: Float32Array }>
}

export async function createEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder()
  // result is a Tensor with shape [1, 384]; result.data is a flat Float32Array
  const result = await embedder([text.slice(0, 512)], { pooling: 'mean', normalize: true })
  const arr = Array.from(result.data as Float32Array)
  if (arr.length === 0) throw new Error('Embedding returned empty array')
  return arr
}

export async function createChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { temperature = 0.3, maxTokens = 1000 } = options
  const groq = getGroq()
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature,
    max_tokens: maxTokens,
  })
  return completion.choices[0].message.content ?? ''
}

export async function createChatStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<AsyncIterable<string>> {
  const { temperature = 0.3, maxTokens = 1000 } = options
  const groq = getGroq()
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  })
  return (async function* () {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) yield text
    }
  })()
}
