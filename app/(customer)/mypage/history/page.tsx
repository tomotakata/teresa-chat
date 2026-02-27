import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/mypage/login')

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers').select('id, name, email').eq('auth_user_id', user.id).single()
  if (!customer) redirect('/mypage/login')

  const { data: conversations } = await serviceClient
    .from('conversations')
    .select('id, created_at, updated_at, status, project_id')
    .eq('customer_id', customer.id)
    .order('updated_at', { ascending: false })

  const projectIds = [...new Set((conversations ?? []).map(c => c.project_id).filter(Boolean))]
  let projectMap: Record<string, string> = {}
  if (projectIds.length > 0) {
    const { data: projects } = await serviceClient
      .from('projects').select('id, name').in('id', projectIds)
    projects?.forEach(p => { projectMap[p.id] = p.name })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">チャット履歴</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{customer.name ?? customer.email}</span>
            <form action="/api/customer/logout" method="POST">
              <button className="text-sm text-gray-500 hover:text-gray-700">ログアウト</button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {(!conversations || conversations.length === 0) ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>チャット履歴はまだありません</p>
          </div>
        ) : (
          conversations.map(conv => (
            <Link key={conv.id} href={`/mypage/history/${conv.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {conv.project_id && projectMap[conv.project_id] ? projectMap[conv.project_id] : 'チャット'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(conv.updated_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${conv.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {conv.status === 'open' ? '対応中' : '完了'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
