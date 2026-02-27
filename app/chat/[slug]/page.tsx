import { createServiceClient } from '@/lib/supabase/server'

interface Props { params: Promise<{ slug: string }> }

export default async function ChatEntryPage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)

  const serviceClient = createServiceClient()
  const { data: project } = await serviceClient
    .from('projects')
    .select('id, name, welcome_message, is_active')
    .eq('slug', slug)
    .single()

  if (!project || !project.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700">チャットが見つかりません</h1>
          <p className="text-gray-500 mt-2">URLをご確認ください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
        <p className="text-gray-500 mb-8">{project.welcome_message}</p>
        <ChatStartButton slug={slug} />
      </div>
    </div>
  )
}

function ChatStartButton({ slug }: { slug: string }) {
  return (
    <a href={`/chat/${slug}/room`}
      className="block w-full bg-indigo-600 text-white rounded-xl py-4 text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md">
      チャットを開始する
    </a>
  )
}
