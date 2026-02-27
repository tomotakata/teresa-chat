import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()

  if (!['open', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers').select('id').eq('auth_user_id', user.id).single()
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { data, error } = await serviceClient
    .from('conversations')
    .update({ status })
    .eq('id', id)
    .eq('customer_id', customer.id)
    .select('id, status, project_id, anonymous_session_id')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  return NextResponse.json(data)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers').select('id').eq('auth_user_id', user.id).single()
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { data: conv } = await serviceClient
    .from('conversations')
    .select('id, status, project_id, anonymous_session_id, projects(slug)')
    .eq('id', id).eq('customer_id', customer.id).single()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(conv)
}
