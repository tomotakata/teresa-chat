import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyLineSignature, createLineClient, replyText } from '@/lib/line-client'
import { generateResponse } from '@/lib/rag'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  const body = JSON.parse(rawBody)
  const events = body.events ?? []

  if (events.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue

    const lineUserId: string = event.source.userId
    const userMessage: string = event.message.text
    const replyToken: string = event.replyToken

    const { data: channels } = await supabase
      .from('channels')
      .select('id, tenant_id, config')
      .eq('type', 'line')
      .eq('enabled', true)

    if (!channels || channels.length === 0) continue

    let matchedChannel = null
    for (const ch of channels) {
      const secret = (ch.config as Record<string, string>).channel_secret ?? ''
      if (verifyLineSignature(secret, rawBody, signature)) {
        matchedChannel = ch
        break
      }
    }

    if (!matchedChannel) continue

    const tenantId: string = matchedChannel.tenant_id
    const accessToken: string = (matchedChannel.config as Record<string, string>).channel_access_token ?? ''

    let conversationId: string

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', 'line')
      .eq('channel_user_id', lineUserId)
      .eq('status', 'open')
      .single()

    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          channel_id: matchedChannel.id,
          channel: 'line',
          channel_user_id: lineUserId,
          status: 'open',
        })
        .select('id')
        .single()
      if (error || !newConv) continue
      conversationId = newConv.id
    }

    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    try {
      const reply = await generateResponse({
        tenantId,
        conversationId,
        userMessage,
        systemPrompt: aiSettings?.system_prompt,
        model: aiSettings?.model,
        temperature: aiSettings?.temperature,
        maxTokens: aiSettings?.max_tokens,
        topK: aiSettings?.top_k,
        threshold: aiSettings?.similarity_threshold,
      })

      const lineClient = createLineClient(accessToken)
      await replyText(lineClient, replyToken, reply)
    } catch (err) {
      console.error('LINE reply error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
