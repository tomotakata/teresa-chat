'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Globe, Plus, X } from 'lucide-react'

type Mode = 'pdf' | 'text' | 'url'

export default function KnowledgeUploadPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('url')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [urls, setUrls] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addUrl = () => setUrls(prev => [...prev, ''])
  const removeUrl = (i: number) => setUrls(prev => prev.filter((_, idx) => idx !== i))
  const updateUrl = (i: number, val: string) => setUrls(prev => prev.map((u, idx) => idx === i ? val : u))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) { toast.error('タイトルを入力してください'); return }
    if (mode === 'pdf' && !file) { toast.error('PDFを選択してください'); return }
    if (mode === 'text' && !text) { toast.error('テキストを入力してください'); return }
    if (mode === 'url') {
      const validUrls = urls.filter(u => u.trim().startsWith('http'))
      if (validUrls.length === 0) { toast.error('有効なURLを入力してください'); return }
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('title', title)
    if (mode === 'pdf' && file) formData.append('file', file)
    if (mode === 'text') formData.append('text', text)
    if (mode === 'url') formData.append('url', urls.filter(u => u.trim()).join('\n'))

    const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? 'アップロードに失敗しました')
      return
    }

    toast.success(`${data.chunkCount}チャンクで学習しました`)
    router.push('/knowledge')
  }

  const modes: { key: Mode; icon: React.ReactNode; label: string }[] = [
    { key: 'url', icon: <Globe className="h-4 w-4" />, label: 'URLから学習' },
    { key: 'pdf', icon: <Upload className="h-4 w-4" />, label: 'PDFアップロード' },
    { key: 'text', icon: <FileText className="h-4 w-4" />, label: 'テキスト入力' },
  ]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/knowledge">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />戻る</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">ドキュメントを追加</h1>
      </div>

      <div className="bg-white rounded-xl border p-6">
        {/* モード切替 */}
        <div className="flex gap-2 mb-6">
          {modes.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* タイトル */}
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={mode === 'url' ? 'サービスサイト・製品ページ など' : '例: 製品マニュアル v2'}
              className="mt-1"
            />
          </div>

          {/* URL入力 */}
          {mode === 'url' && (
            <div>
              <Label>学習させるURL</Label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">
                ページ内のテキスト・画像のalt情報・見出しなどをすべて学習します
              </p>
              <div className="space-y-2">
                {urls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={e => updateUrl(i, e.target.value)}
                      placeholder="https://example.com/product"
                      className="flex-1"
                      type="url"
                    />
                    {urls.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeUrl(i)}>
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addUrl} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />URLを追加
                </Button>
              </div>

              {/* 学習内容の説明 */}
              <div className="mt-4 bg-indigo-50 rounded-lg p-4 space-y-1.5">
                <p className="text-xs font-semibold text-indigo-700">学習される情報</p>
                {[
                  '📝 ページ内の全テキスト（見出し・本文・説明文）',
                  '🖼️ 画像のalt属性・キャプション情報',
                  '📌 メタ情報（ページタイトル・description）',
                ].map(item => (
                  <p key={item} className="text-xs text-indigo-600">{item}</p>
                ))}
              </div>
            </div>
          )}

          {/* PDF入力 */}
          {mode === 'pdf' && (
            <div>
              <Label>PDFファイル</Label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  const f = e.dataTransfer.files[0]
                  if (f?.type === 'application/pdf') { setFile(f); if (!title) setTitle(f.name.replace('.pdf', '')) }
                }}
                onClick={() => fileRef.current?.click()}
                className={`mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
                  dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-indigo-600">{file.name}</p>
                ) : (
                  <p className="text-sm text-gray-500">PDFをドラッグ&ドロップ、またはクリックして選択</p>
                )}
                <input
                  ref={fileRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); if (!title) setTitle(f.name.replace('.pdf', '')) }
                  }}
                />
              </div>
            </div>
          )}

          {/* テキスト入力 */}
          {mode === 'text' && (
            <div>
              <Label htmlFor="text">テキストコンテンツ</Label>
              <Textarea
                id="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="製品の説明、FAQ、サポート情報などを入力してください..."
                className="mt-1 min-h-[200px]"
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === 'url' ? 'URLを解析・学習中...' : '処理中...'
              : '学習させる'}
          </Button>
        </form>
      </div>
    </div>
  )
}
