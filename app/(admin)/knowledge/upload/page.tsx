'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText } from 'lucide-react'

export default function KnowledgeUploadPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'pdf' | 'text'>('pdf')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') {
      setFile(f)
      if (!title) setTitle(f.name.replace('.pdf', ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) { toast.error('タイトルを入力してください'); return }
    if (mode === 'pdf' && !file) { toast.error('PDFを選択してください'); return }
    if (mode === 'text' && !text) { toast.error('テキストを入力してください'); return }

    setLoading(true)
    const formData = new FormData()
    formData.append('title', title)
    if (mode === 'pdf' && file) formData.append('file', file)
    if (mode === 'text') formData.append('text', text)

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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/knowledge">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />戻る</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">ドキュメントを追加</h1>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <Upload className="h-4 w-4" />PDFアップロード
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'text' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <FileText className="h-4 w-4" />テキスト入力
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 製品マニュアル v2"
              className="mt-1"
            />
          </div>

          {mode === 'pdf' ? (
            <div>
              <Label>PDFファイル</Label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-indigo-600">{file.name}</p>
                ) : (
                  <p className="text-sm text-gray-500">PDFをドラッグ&ドロップ、またはクリックして選択</p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); if (!title) setTitle(f.name.replace('.pdf', '')) }
                  }}
                />
              </div>
            </div>
          ) : (
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
            {loading ? '処理中...' : '学習させる'}
          </Button>
        </form>
      </div>
    </div>
  )
}
