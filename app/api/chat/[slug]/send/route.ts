import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateResponse, generateSuggestedQuestions } from '@/lib/rag'

export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)

  const serviceClient = createServiceClient()

  const { data: project } = await serviceClient
    .from('projects').select('id, tenant_id, welcome_message, doc_ids').eq('slug', slug).eq('is_active', true).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { message, conversation_id, session_token } = await req.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (!session_token) return NextResponse.json({ error: 'session_token required' }, { status: 400 })

  // 匿名セッション取得 or 自動作成
  let { data: anonSession } = await serviceClient
    .from('anonymous_sessions').select('id, customer_id').eq('session_token', session_token).single()
  if (!anonSession) {
    const { data: newSession } = await serviceClient
      .from('anonymous_sessions')
      .insert({ session_token, project_id: project.id })
      .select('id, customer_id').single()
    anonSession = newSession
  }
  if (!anonSession) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })

  // 会話の取得または作成
  let convId: string = conversation_id
  if (!convId) {
    const { data: conv } = await serviceClient
      .from('conversations')
      .insert({
        tenant_id: project.tenant_id,
        project_id: project.id,
        customer_id: anonSession.customer_id ?? null,
        anonymous_session_id: anonSession.id,
        channel: 'web',
        channel_user_id: session_token,
        channel_user_name: '匿名ユーザー',
        status: 'open',
      })
      .select('id').single()
    if (!conv) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    convId = conv.id
  }

  // AI 設定取得
  const { data: aiSettings } = await serviceClient
    .from('ai_settings').select('*').eq('tenant_id', project.tenant_id).single()

  const systemPrompt = aiSettings?.system_prompt ?? 'あなたは親切なカスタマーサポートアシスタントです。'

  try {
    const reply = await generateResponse({
      tenantId: project.tenant_id,
      conversationId: convId,
      userMessage: message,
      systemPrompt,
      temperature: aiSettings?.temperature,
      maxTokens: aiSettings?.max_tokens,
      topK: aiSettings?.top_k,
      threshold: aiSettings?.similarity_threshold,
      docIds: (project.doc_ids as string[] | null) ?? [],
    })

    const suggested_questions = await generateSuggestedQuestions(message, reply, systemPrompt)

    return NextResponse.json({ reply, conversation_id: convId, suggested_questions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send] generateResponse error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
