import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getAdminTenantId(serviceClient: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await serviceClient
    .from('users').select('tenant_id').eq('id', userId).single()
  return data?.tenant_id as string | undefined
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const tenantId = await getAdminTenantId(serviceClient, user.id)
  if (!tenantId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await serviceClient
    .from('projects').select('*').eq('id', id).eq('tenant_id', tenantId).single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const tenantId = await getAdminTenantId(serviceClient, user.id)
  if (!tenantId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const { name, description, welcome_message, is_active, doc_ids } = body

  const { data, error } = await serviceClient
    .from('projects')
    .update({ name, description, welcome_message, is_active, doc_ids: doc_ids ?? [] })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const tenantId = await getAdminTenantId(serviceClient, user.id)
  if (!tenantId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await serviceClient
    .from('projects').delete().eq('id', id).eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
