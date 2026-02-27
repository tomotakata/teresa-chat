import { createClient } from '@/lib/supabase/server'
import ChannelSettingsClient from './ChannelSettingsClient'

export default async function ChannelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = userData?.tenant_id ?? ''

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('tenant_id', tenantId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com'
  const widgetEmbedCode = `<!-- FonDesk AI チャットウィジェット -->
<script>
  window.FONDESK_TENANT_ID = "${tenantId}";
  window.FONDESK_API_URL = "${appUrl}";
</script>
<script src="${appUrl}/widget.js" defer></script>`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">チャネル設定</h1>
      <ChannelSettingsClient
        channels={(channels ?? []) as Parameters<typeof ChannelSettingsClient>[0]['channels']}
        tenantId={tenantId}
        widgetEmbedCode={widgetEmbedCode}
      />
    </div>
  )
}
