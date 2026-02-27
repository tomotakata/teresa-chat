import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { session_token, customer_id } = await req.json()
  if (!session_token || !customer_id) {
    return NextResponse.json({ error: 'session_token and customer_id required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // 匿名セッションに customer_id を紐付け
  await serviceClient
    .from('anonymous_sessions')
    .update({ customer_id })
    .eq('session_token', session_token)

  // 既存会話にも customer_id を紐付け
  const { data: sessions } = await serviceClient
    .from('anonymous_sessions').select('id').eq('session_token', session_token)

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id)
    await serviceClient
      .from('conversations')
      .update({ customer_id })
      .in('anonymous_session_id', sessionIds)
  }

  return NextResponse.json({ ok: true })
}
