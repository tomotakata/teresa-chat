import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateStreamResponse } from '@/lib/rag'

export async function POST(req: NextRequest) {
  const { tenantId, conversationId, message } = await req.json()

  if (!tenantId || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  let convId = conversationId

  if (!convId) {
    const { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', 'widget')
      .eq('enabled', true)
      .single()

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        channel_id: channel?.id ?? null,
        channel: 'widget',
        channel_user_id: `widget_${Date.now()}`,
        status: 'open',
      })
      .select('id')
      .single()

    if (error || !newConv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }
    convId = newConv.id
  }

  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`)
      )

      await generateStreamResponse(
        {
          tenantId,
          conversationId: convId,
          userMessage: message,
          systemPrompt: aiSettings?.system_prompt,
          model: aiSettings?.model,
          temperature: aiSettings?.temperature,
          maxTokens: aiSettings?.max_tokens,
          topK: aiSettings?.top_k,
          threshold: aiSettings?.similarity_threshold,
        },
        (chunk) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
          )
        }
      )

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
