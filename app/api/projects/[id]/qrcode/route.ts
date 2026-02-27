import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: project } = await serviceClient
    .from('projects').select('slug, name').eq('id', id).single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const baseUrl = req.nextUrl.origin
  const chatUrl = `${baseUrl}/chat/${project.slug}`
  const format = req.nextUrl.searchParams.get('format') ?? 'png'

  if (format === 'png') {
    const buffer = await QRCode.toBuffer(chatUrl, { width: 400, margin: 2 })
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${project.slug}.png"`,
      },
    })
  }

  // PDF: HTML page for printing
  const dataUrl = await QRCode.toDataURL(chatUrl, { width: 400, margin: 2 })
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${project.name} QRコード</title>
  <style>
    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #666; margin-bottom: 24px; font-size: 14px; word-break: break-all; }
    img { width: 280px; height: 280px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${project.name}</h1>
  <p>${chatUrl}</p>
  <img src="${dataUrl}" alt="QRコード" />
  <br/>
  <button onclick="window.print()">印刷 / PDF保存</button>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
