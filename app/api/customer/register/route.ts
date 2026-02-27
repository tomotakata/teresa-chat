import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const anonClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: authData, error: authError } = await anonClient.auth.signUp({
    email,
    password,
    options: { data: { user_type: 'customer', name: name ?? '' } },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  return NextResponse.json({ ok: true, user: { id: authData.user?.id, email } }, { status: 201 })
}
