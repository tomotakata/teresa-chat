import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import ConversationFilters from './ConversationFilters'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'オープン', variant: 'default' },
  resolved: { label: '解決済み', variant: 'secondary' },
  escalated: { label: 'エスカレーション', variant: 'destructive' },
}

const channelConfig: Record<string, string> = {
  line: 'LINE',
  email: 'メール',
  widget: 'Webチャット',
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const page = parseInt(params.page ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('conversations')
    .select('id, channel, channel_user_id, channel_user_name, status, created_at, updated_at', { count: 'exact' })
    .eq('tenant_id', userData?.tenant_id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.channel) query = query.eq('channel', params.channel)

  const { data: conversations, count } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">会話履歴</h1>
        <ConversationFilters />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">ユーザー</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">チャネル</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">ステータス</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">最終更新</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {(conversations ?? []).map(conv => {
              const s = statusConfig[conv.status] ?? { label: conv.status, variant: 'outline' as const }
              return (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">
                      {conv.channel_user_name ?? conv.channel_user_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {channelConfig[conv.channel] ?? conv.channel}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(conv.updated_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/conversations/${conv.id}`}
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!conversations || conversations.length === 0) && (
          <div className="p-12 text-center text-gray-500">会話がありません</div>
        )}
      </div>

      {count && count > limit && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`?page=${page - 1}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-100">前へ</Link>
          )}
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {Math.ceil(count / limit)}</span>
          {page * limit < count && (
            <Link href={`?page=${page + 1}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-100">次へ</Link>
          )}
        </div>
      )}
    </div>
  )
}
