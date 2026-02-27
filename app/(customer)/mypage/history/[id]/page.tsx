import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CloseConversationButton from './CloseConversationButton'
import ResumeConversationButton from './ResumeConversationButton'

interface Props { params: Promise<{ id: string }> }

export default async function ConversationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/mypage/login')

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers').select('id').eq('auth_user_id', user.id).single()
  if (!customer) redirect('/mypage/login')

  const { data: conv } = await serviceClient
    .from('conversations').select('id, project_id, created_at, status').eq('id', id).eq('customer_id', customer.id).single()
  if (!conv) redirect('/mypage/history')

  let projectName = 'チャット'
  if (conv.project_id) {
    const { data: project } = await serviceClient
      .from('projects').select('name').eq('id', conv.project_id).single()
    if (project) projectName = project.name
  }

  const { data: messages } = await serviceClient
    .from('messages').select('role, content, created_at').eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/mypage/history" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{projectName}</h1>
              <p className="text-xs text-gray-500">{new Date(conv.created_at).toLocaleString('ja-JP')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              conv.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {conv.status === 'open' ? '対応中' : '対応終了'}
            </span>
            {conv.status === 'open' && (
              <CloseConversationButton conversationId={id} />
            )}
            {conv.status === 'closed' && (
              <ResumeConversationButton conversationId={id} />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {(messages ?? []).map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-indigo-600 text-xs font-bold">AI</span>
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {conv.status === 'closed' && (
          <div className="text-center py-6">
            <span className="text-xs text-gray-400 bg-gray-100 px-4 py-2 rounded-full">
              このお問い合わせは対応終了しました
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
