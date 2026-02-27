import { createClient, createServiceClient } from '@/lib/supabase/server'
import ChannelSettingsClient from './ChannelSettingsClient'

export default async function ChannelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()
  const { data: userData } = await serviceClient
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = userData?.tenant_id ?? ''

  const { data: channels } = await serviceClient
    .from('channels')
    .select('*')
    .eq('tenant_id', tenantId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com'
  const widgetEmbedCode = `<!-- Teresa チャットウィジェット -->
<script>
  window.TERESA_TENANT_ID = "${tenantId}";
  window.TERESA_API_URL = "${appUrl}";
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
