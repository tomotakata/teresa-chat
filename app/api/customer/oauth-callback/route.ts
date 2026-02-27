import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sessionToken = req.nextUrl.searchParams.get('session_token')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user && sessionToken) {
    const serviceClient = createServiceClient()

    // customers テーブルに upsert
    const { data: customer } = await serviceClient
      .from('customers')
      .upsert({ auth_user_id: user.id, email: user.email!, name: user.user_metadata?.full_name ?? null }, { onConflict: 'auth_user_id' })
      .select('id').single()

    if (customer) {
      // 匿名セッションと紐付け
      await serviceClient.from('anonymous_sessions').update({ customer_id: customer.id }).eq('session_token', sessionToken)
      const { data: sessions } = await serviceClient.from('anonymous_sessions').select('id').eq('session_token', sessionToken)
      if (sessions && sessions.length > 0) {
        await serviceClient.from('conversations').update({ customer_id: customer.id }).in('anonymous_session_id', sessions.map(s => s.id))
      }
    }
  }

  return NextResponse.redirect(new URL('/mypage/history', req.url))
}
