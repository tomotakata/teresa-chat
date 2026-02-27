import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { session_token, device_fingerprint } = await req.json()

  if (!session_token) return NextResponse.json({ error: 'session_token required' }, { status: 400 })

  const serviceClient = createServiceClient()

  const { data: project } = await serviceClient
    .from('projects').select('id').eq('slug', slug).eq('is_active', true).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // 既存セッションを取得 or 新規作成
  const { data: existing } = await serviceClient
    .from('anonymous_sessions').select('id, customer_id').eq('session_token', session_token).single()

  if (existing) return NextResponse.json({ session_id: existing.id, customer_id: existing.customer_id })

  const { data: created, error } = await serviceClient
    .from('anonymous_sessions')
    .insert({ session_token, device_fingerprint: device_fingerprint ?? null, project_id: project.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session_id: created.id, customer_id: null })
}
