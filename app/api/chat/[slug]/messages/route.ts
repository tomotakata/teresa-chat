import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const conversationId = req.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
