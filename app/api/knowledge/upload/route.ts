import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ingestDocument } from '@/lib/rag'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const tenantId: string = userData.tenant_id
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const text = formData.get('text') as string | null
  const title = formData.get('title') as string | null

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!file && !text) return NextResponse.json({ error: 'File or text required' }, { status: 400 })

  const serviceClient = createServiceClient()

  const { data: doc, error: docError } = await serviceClient
    .from('knowledge_docs')
    .insert({
      tenant_id: tenantId,
      title,
      type: file ? 'pdf' : 'text',
      status: 'processing',
    })
    .select('id')
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 })
  }

  try {
    let fileBuffer: Buffer | undefined
    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)

      const { error: storageError } = await serviceClient.storage
        .from('knowledge-files')
        .upload(`${tenantId}/${doc.id}/${file.name}`, fileBuffer, {
          contentType: file.type,
          upsert: true,
        })

      if (!storageError) {
        await serviceClient
          .from('knowledge_docs')
          .update({ storage_path: `${tenantId}/${doc.id}/${file.name}` })
          .eq('id', doc.id)
      }
    }

    const chunkCount = await ingestDocument({
      tenantId,
      docId: doc.id,
      title,
      type: file ? 'pdf' : 'text',
      content: text ?? undefined,
      fileBuffer,
    })

    return NextResponse.json({ ok: true, docId: doc.id, chunkCount })
  } catch (err) {
    await serviceClient
      .from('knowledge_docs')
      .update({ status: 'error' })
      .eq('id', doc.id)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ingest failed' },
      { status: 500 }
    )
  }
}
