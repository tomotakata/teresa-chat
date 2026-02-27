import { createClient, createServiceClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = userData?.tenant_id

  const [convResult, msgResult, docResult] = await Promise.all([
    supabase.from('conversations').select('id, status, channel', { count: 'exact' }).eq('tenant_id', tenantId),
    supabase.from('messages').select('id', { count: 'exact' }),
    supabase.from('knowledge_docs').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId),
  ])

  const conversations = convResult.data ?? []
  const totalConv = convResult.count ?? 0
  const openConv = conversations.filter(c => c.status === 'open').length
  const resolvedConv = conversations.filter(c => c.status === 'resolved').length
  const escalatedConv = conversations.filter(c => c.status === 'escalated').length
  const totalDocs = docResult.count ?? 0
  const readyDocs = (docResult.data ?? []).filter(d => d.status === 'ready').length

  const channelCounts: Record<string, number> = {}
  conversations.forEach(c => {
    channelCounts[c.channel] = (channelCounts[c.channel] ?? 0) + 1
  })

  const stats = [
    { label: '総会話数', value: totalConv, color: 'bg-indigo-500' },
    { label: 'オープン', value: openConv, color: 'bg-yellow-500' },
    { label: '解決済み', value: resolvedConv, color: 'bg-green-500' },
    { label: 'エスカレーション', value: escalatedConv, color: 'bg-red-500' },
    { label: 'ドキュメント数', value: totalDocs, color: 'bg-blue-500' },
    { label: '学習済みドキュメント', value: readyDocs, color: 'bg-teal-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ダッシュボード</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border p-6">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.color} mb-3`}>
              <span className="text-white text-lg font-bold">{s.value}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">チャネル別会話数</h2>
        {Object.keys(channelCounts).length === 0 ? (
          <p className="text-gray-500 text-sm">まだ会話がありません</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(channelCounts).map(([ch, count]) => (
              <div key={ch} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-gray-700">{ch}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 bg-indigo-200 rounded-full w-32">
                    <div
                      className="h-2 bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min((count / totalConv) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
