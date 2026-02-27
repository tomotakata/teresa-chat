import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) redirect('/login')

  const { data: projects } = await serviceClient
    .from('projects').select('*').eq('tenant_id', userData.tenant_id).order('created_at')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
          <p className="text-gray-500 text-sm mt-1">チャットプロジェクトを管理します</p>
        </div>
        <Link href="/projects/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          + 新規作成
        </Link>
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">プロジェクトがありません</p>
          <p className="text-gray-400 text-sm mt-1">「新規作成」からプロジェクトを追加してください</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-900">{p.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? '公開中' : '非公開'}
                    </span>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mb-2">{p.description}</p>}
                  <p className="text-xs text-gray-400 font-mono">/chat/{p.slug}</p>
                </div>
                <Link href={`/projects/${p.id}`}
                  className="ml-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap">
                  設定 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
