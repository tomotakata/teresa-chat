import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tenant_id, system_prompt, model, temperature, max_tokens, similarity_threshold, top_k } = body

  const { error } = await supabase.from('ai_settings').upsert(
    { tenant_id, system_prompt, model, temperature, max_tokens, similarity_threshold, top_k },
    { onConflict: 'tenant_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
