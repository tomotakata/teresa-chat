import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DeleteDocButton from './DeleteDocButton'

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  ready: { label: '学習済み', variant: 'default' },
  processing: { label: '処理中', variant: 'secondary' },
  error: { label: 'エラー', variant: 'destructive' },
}

export default async function KnowledgePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const { data: docs } = await supabase
    .from('knowledge_docs')
    .select('id, title, type, status, chunk_count, created_at')
    .eq('tenant_id', userData?.tenant_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ナレッジベース</h1>
        <Link href="/knowledge/upload">
          <Button>ドキュメントを追加</Button>
        </Link>
      </div>

      {!docs || docs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500">まだドキュメントが登録されていません</p>
          <Link href="/knowledge/upload" className="mt-4 inline-block">
            <Button variant="outline">最初のドキュメントを追加</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">タイトル</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">種類</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">ステータス</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">チャンク数</th>
                <th className="text-left px-6 py-3 text-gray-600 font-medium">登録日</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {docs.map(doc => {
                const s = statusLabel[doc.status] ?? { label: doc.status, variant: 'secondary' as const }
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{doc.title}</td>
                    <td className="px-6 py-4 text-gray-500 uppercase">{doc.type}</td>
                    <td className="px-6 py-4">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{doc.chunk_count}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DeleteDocButton docId={doc.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
