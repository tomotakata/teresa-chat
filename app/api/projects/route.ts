import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await serviceClient
    .from('projects')
    .select('*')
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const { name, description, welcome_message } = body
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // 短いランダムスラッグ（例: x4k9mz2a）
  const slug = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6)

  const { data, error } = await serviceClient
    .from('projects')
    .insert({ tenant_id: userData.tenant_id, name, slug, description, welcome_message })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
