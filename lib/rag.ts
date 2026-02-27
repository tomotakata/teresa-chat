import { createServiceClient } from './supabase/server'
import { createEmbedding, getOpenAI } from './openai'
import { chunkText } from './chunker'
import { parsePdf } from './pdf-parser'

export interface IngestOptions {
  tenantId: string
  docId: string
  title: string
  type: 'pdf' | 'text'
  content?: string
  fileBuffer?: Buffer
}

export async function ingestDocument(options: IngestOptions): Promise<number> {
  const { tenantId, docId, type, content, fileBuffer } = options
  const supabase = createServiceClient()

  let text = ''
  if (type === 'pdf' && fileBuffer) {
    text = await parsePdf(fileBuffer)
  } else if (content) {
    text = content
  }

  if (!text.trim()) throw new Error('No text content to ingest')

  const chunks = chunkText(text, { docId, type })

  const rows = []
  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content)
    rows.push({
      doc_id: docId,
      tenant_id: tenantId,
      content: chunk.content,
      embedding: `[${embedding.join(',')}]`,
      metadata: chunk.metadata,
    })
  }

  const { error } = await supabase.from('knowledge_chunks').insert(rows)
  if (error) throw new Error(error.message)

  await supabase
    .from('knowledge_docs')
    .update({ status: 'ready', chunk_count: rows.length })
    .eq('id', docId)

  return rows.length
}

export interface RetrieveOptions {
  tenantId: string
  query: string
  topK?: number
  threshold?: number
}

export interface RetrievedChunk {
  id: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

export async function retrieveChunks(options: RetrieveOptions): Promise<RetrievedChunk[]> {
  const { tenantId, query, topK = 5, threshold = 0.7 } = options
  const supabase = createServiceClient()

  const embedding = await createEmbedding(query)

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: `[${embedding.join(',')}]`,
    match_tenant_id: tenantId,
    match_count: topK,
    match_threshold: threshold,
  })

  if (error) throw new Error(error.message)
  return (data ?? []) as RetrievedChunk[]
}

export interface GenerateOptions {
  tenantId: string
  conversationId: string
  userMessage: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  topK?: number
  threshold?: number
  stream?: boolean
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function generateResponse(options: GenerateOptions): Promise<string> {
  const {
    tenantId,
    conversationId,
    userMessage,
    systemPrompt = 'あなたは親切なカスタマーサポートアシスタントです。',
    model = 'gpt-4o',
    temperature = 0.3,
    maxTokens = 1000,
    topK = 5,
    threshold = 0.7,
  } = options

  const supabase = createServiceClient()

  const chunks = await retrieveChunks({ tenantId, query: userMessage, topK, threshold })

  const { data: historyData } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10)

  const history: Message[] = (historyData ?? []) as Message[]

  const contextText =
    chunks.length > 0
      ? '\n\n---\n以下は関連するサポート情報です:\n' +
        chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
      : ''

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt + contextText },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const completion = await getOpenAI().chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  })

  const reply = completion.choices[0].message.content ?? ''

  await supabase.from('messages').insert([
    { conversation_id: conversationId, role: 'user', content: userMessage },
    { conversation_id: conversationId, role: 'assistant', content: reply },
  ])

  return reply
}

export async function generateStreamResponse(
  options: GenerateOptions,
  onChunk: (chunk: string) => void
): Promise<string> {
  const {
    tenantId,
    conversationId,
    userMessage,
    systemPrompt = 'あなたは親切なカスタマーサポートアシスタントです。',
    model = 'gpt-4o',
    temperature = 0.3,
    maxTokens = 1000,
    topK = 5,
    threshold = 0.7,
  } = options

  const supabase = createServiceClient()
  const chunks = await retrieveChunks({ tenantId, query: userMessage, topK, threshold })

  const { data: historyData } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10)

  const history: Message[] = (historyData ?? []) as Message[]

  const contextText =
    chunks.length > 0
      ? '\n\n---\n以下は関連するサポート情報です:\n' +
        chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
      : ''

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt + contextText },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const stream = await getOpenAI().chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  })

  let fullReply = ''
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) {
      fullReply += text
      onChunk(text)
    }
  }

  await supabase.from('messages').insert([
    { conversation_id: conversationId, role: 'user', content: userMessage },
    { conversation_id: conversationId, role: 'assistant', content: fullReply },
  ])

  return fullReply
}

// Import for type reference
import type OpenAI from 'openai'
