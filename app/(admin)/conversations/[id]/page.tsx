import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import EscalateButton from './EscalateButton'

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: conv } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (!conv) notFound()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/conversations">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />戻る</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {conv.channel_user_name ?? conv.channel_user_id}
          </h1>
          <p className="text-sm text-gray-500">{conv.channel} • {new Date(conv.created_at).toLocaleString('ja-JP')}</p>
        </div>
        <Badge variant={
          conv.status === 'open' ? 'default' :
          conv.status === 'resolved' ? 'secondary' : 'destructive'
        }>
          {conv.status === 'open' ? 'オープン' : conv.status === 'resolved' ? '解決済み' : 'エスカレーション'}
        </Badge>
        <EscalateButton conversationId={conv.id} currentStatus={conv.status} />
      </div>

      <div className="space-y-4">
        {(messages ?? []).map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'assistant'
                  ? 'bg-white border text-gray-900'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'assistant' ? 'text-gray-400' : 'text-indigo-200'}`}>
                {new Date(msg.created_at).toLocaleTimeString('ja-JP')}
              </p>
            </div>
          </div>
        ))}
        {(!messages || messages.length === 0) && (
          <p className="text-center text-gray-500 py-10">メッセージがありません</p>
        )}
      </div>
    </div>
  )
}
