import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const anonClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({ email, password })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 401 })
  if (!authData.user) return NextResponse.json({ error: 'Login failed' }, { status: 500 })

  const serviceClient = createServiceClient()

  // customers テーブルに存在しなければ作成（メール確認済みユーザーのみここに到達）
  const { data: customer } = await serviceClient
    .from('customers')
    .upsert(
      {
        auth_user_id: authData.user.id,
        email: authData.user.email!,
        name: (authData.user.user_metadata?.name as string) ?? null,
      },
      { onConflict: 'auth_user_id' }
    )
    .select('id, email, name')
    .single()

  return NextResponse.json({ ok: true, session: authData.session, customer })
}
