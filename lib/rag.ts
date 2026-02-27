import { createServiceClient } from './supabase/server'
import { createEmbedding, createChatCompletion, createChatStream } from './openai'
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

  // バッチ分割して挿入（Supabase の 2MB 制限対策）
  const BATCH_SIZE = 20
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('knowledge_chunks').insert(batch)
    if (error) throw new Error(error.message)
  }

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
  docIds?: string[]
}

export interface RetrievedChunk {
  id: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

export async function retrieveChunks(options: RetrieveOptions): Promise<RetrievedChunk[]> {
  const { tenantId, query, topK = 5, threshold = 0.0, docIds } = options
  const supabase = createServiceClient()

  const embedding = await createEmbedding(query)

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: `[${embedding.join(',')}]`,
    match_tenant_id: tenantId,
    match_count: topK,
    match_threshold: threshold,
    match_doc_ids: docIds && docIds.length > 0 ? docIds : null,
  })

  console.log('[RAG] retrieve chunks:', { tenantId, query: query.slice(0, 30), docIds: docIds?.length ?? 0, found: data?.length ?? 0, error: error?.message })

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
  docIds?: string[]
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function generateSuggestedQuestions(
  userMessage: string,
  assistantReply: string,
  systemPrompt: string
): Promise<string[]> {
  const prompt = `以下の会話の流れを踏まえて、ユーザーが次に聞きそうな質問を日本語で3つ、短く提案してください。
JSON配列のみで返してください。例: ["質問1", "質問2", "質問3"]

ユーザーの質問: ${userMessage}
AIの回答: ${assistantReply.slice(0, 300)}`

  try {
    const result = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], { temperature: 0.5, maxTokens: 200 })
    const match = result.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as string[]
  } catch {}
  return []
}

export async function generateResponse(options: GenerateOptions): Promise<string> {
  const {
    tenantId,
    conversationId,
    userMessage,
    systemPrompt = 'あなたは親切なカスタマーサポートアシスタントです。',
    temperature = 0.3,
    maxTokens = 1000,
    topK = 5,
    threshold = 0.0,
    docIds,
  } = options

  const supabase = createServiceClient()

  const chunks = await retrieveChunks({ tenantId, query: userMessage, topK, threshold, docIds })

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

  const messages = [
    { role: 'system' as const, content: systemPrompt + contextText },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const reply = await createChatCompletion(messages, { temperature, maxTokens })

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
    temperature = 0.3,
    maxTokens = 1000,
    topK = 5,
    threshold = 0.0,
    docIds,
  } = options

  const supabase = createServiceClient()
  const chunks = await retrieveChunks({ tenantId, query: userMessage, topK, threshold, docIds })

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

  const messages2 = [
    { role: 'system' as const, content: systemPrompt + contextText },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const streamIterable = await createChatStream(messages2, { temperature, maxTokens })

  let fullReply = ''
  for await (const text of streamIterable) {
    fullReply += text
    onChunk(text)
  }

  await supabase.from('messages').insert([
    { conversation_id: conversationId, role: 'user', content: userMessage },
    { conversation_id: conversationId, role: 'assistant', content: fullReply },
  ])

  return fullReply
}


