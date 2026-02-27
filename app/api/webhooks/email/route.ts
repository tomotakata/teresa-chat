import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateResponse } from '@/lib/rag'
import { sendEmail, extractEmailAddress, buildReplySubject } from '@/lib/email-client'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    tenant_id: tenantId,
    from,
    subject,
    text: emailText,
    message_id: messageId,
    references,
  } = body as {
    tenant_id: string
    from: string
    subject: string
    text: string
    message_id: string
    references?: string
  }

  if (!tenantId || !from || !emailText) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const senderEmail = extractEmailAddress(from)

  const { data: channel } = await supabase
    .from('channels')
    .select('id, config')
    .eq('tenant_id', tenantId)
    .eq('type', 'email')
    .eq('enabled', true)
    .single()

  if (!channel) {
    return NextResponse.json({ error: 'No active email channel' }, { status: 404 })
  }

  let conversationId: string

  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('channel', 'email')
    .eq('channel_user_id', senderEmail)
    .eq('status', 'open')
    .single()

  if (existingConv) {
    conversationId = existingConv.id
  } else {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        channel_id: channel.id,
        channel: 'email',
        channel_user_id: senderEmail,
        channel_user_name: from,
        status: 'open',
      })
      .select('id')
      .single()
    if (error || !newConv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }
    conversationId = newConv.id
  }

  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const reply = await generateResponse({
    tenantId,
    conversationId,
    userMessage: emailText,
    systemPrompt: aiSettings?.system_prompt,
    model: aiSettings?.model,
    temperature: aiSettings?.temperature,
    maxTokens: aiSettings?.max_tokens,
    topK: aiSettings?.top_k,
    threshold: aiSettings?.similarity_threshold,
  })

  const emailConfig = channel.config as Record<string, string | number | boolean>

  await sendEmail(
    {
      host: emailConfig.smtp_host as string,
      port: emailConfig.smtp_port as number,
      secure: emailConfig.smtp_secure as boolean,
      user: emailConfig.smtp_user as string,
      pass: emailConfig.smtp_pass as string,
    },
    {
      from: `${emailConfig.from_name ?? 'Support'} <${emailConfig.smtp_user}>`,
      to: senderEmail,
      subject: buildReplySubject(subject),
      text: reply,
      inReplyTo: messageId,
      references: [references, messageId].filter(Boolean).join(' '),
    }
  )

  return NextResponse.json({ ok: true, conversationId })
}
