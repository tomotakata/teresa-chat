import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import ProjectSettingsClient from './ProjectSettingsClient'
import ChatUrlBox from './ChatUrlBox'

interface Props { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users').select('tenant_id').eq('id', user.id).single()
  if (!userData) redirect('/login')

  const { data: project } = await serviceClient
    .from('projects').select('*').eq('id', id).eq('tenant_id', userData.tenant_id).single()
  if (!project) redirect('/projects')

  const { data: docs } = await serviceClient
    .from('knowledge_docs')
    .select('id, title, status, chunk_count, created_at')
    .eq('tenant_id', userData.tenant_id)
    .order('created_at', { ascending: false })

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const baseUrl = `${proto}://${host}`
  const chatUrl = `${baseUrl}/chat/${project.slug}`

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/projects" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500">プロジェクト設定</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* チャットURL・QRコード */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">チャットURL・QRコード</h2>
          <ChatUrlBox chatUrl={chatUrl} projectId={id} projectSlug={project.slug} />
        </div>

        {/* プロジェクト設定フォーム */}
        <ProjectSettingsClient project={project} docs={docs ?? []} />

        {/* ナレッジ管理リンク */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">ナレッジ・AI設定</h2>
          <div className="flex gap-3">
            <Link href="/knowledge"
              className="flex-1 text-center border border-indigo-200 text-indigo-700 rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-50 transition-colors">
              ナレッジ管理
            </Link>
            <Link href="/ai-settings"
              className="flex-1 text-center border border-indigo-200 text-indigo-700 rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-50 transition-colors">
              AI設定
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
