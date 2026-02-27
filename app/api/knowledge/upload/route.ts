import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ingestDocument } from '@/lib/rag'
import { scrapeUrl } from '@/lib/url-scraper'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()

  const { data: userData } = await serviceClient
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const tenantId: string = userData.tenant_id
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const text = formData.get('text') as string | null
  const urlInput = formData.get('url') as string | null
  const title = formData.get('title') as string | null

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!file && !text && !urlInput) {
    return NextResponse.json({ error: 'File, text, or URL required' }, { status: 400 })
  }
  const docType = file ? 'pdf' : urlInput ? 'url' : 'text'

  const { data: doc, error: docError } = await serviceClient
    .from('knowledge_docs')
    .insert({
      tenant_id: tenantId,
      title,
      type: docType,
      storage_path: urlInput ?? null,
      status: 'processing',
    })
    .select('id')
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 })
  }

  try {
    let fileBuffer: Buffer | undefined
    let contentText: string | undefined = text ?? undefined

    // PDF処理
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

    // URL スクレイピング処理
    if (urlInput) {
      const urls = urlInput
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.startsWith('http'))

      if (urls.length === 0) {
        throw new Error('有効なURLが入力されていません')
      }

      const scraped = []
      for (const url of urls) {
        const result = await scrapeUrl(url)
        scraped.push(`=== ${result.title} (${url}) ===\n${result.description}\n\n${result.text}`)
      }
      contentText = scraped.join('\n\n---\n\n')
    }

    const chunkCount = await ingestDocument({
      tenantId,
      docId: doc.id,
      title,
      type: docType as 'pdf' | 'text',
      content: contentText,
      fileBuffer,
    })

    return NextResponse.json({ ok: true, docId: doc.id, chunkCount })
  } catch (err) {
    console.error('[upload] ingest error:', err)
    await serviceClient
      .from('knowledge_docs')
      .update({ status: 'error' })
      .eq('id', doc.id)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
