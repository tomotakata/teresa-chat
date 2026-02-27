import Groq from 'groq-sdk'
import OpenAI from 'openai'

let _groq: Groq | null = null
let _openai: OpenAI | null = null

export function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export async function createEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI()
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
    dimensions: 384,
  })
  return res.data[0].embedding
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
