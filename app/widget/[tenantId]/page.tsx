import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ChatWidget from '@/components/widget/ChatWidget'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const supabase = createServiceClient()

  const { data: channel } = await supabase
    .from('channels')
    .select('config')
    .eq('tenant_id', tenantId)
    .eq('type', 'widget')
    .eq('enabled', true)
    .single()

  if (!channel) notFound()

  const config = channel.config as Record<string, string>
  const welcomeMessage = config.welcome_message

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center text-gray-400 text-sm">
        <p>このページはチャットウィジェットのデモです</p>
        <p className="mt-1">右下のボタンをクリックしてチャットを開始できます</p>
      </div>
      <ChatWidget tenantId={tenantId} welcomeMessage={welcomeMessage} />
    </div>
  )
}
