import { createClient } from '@/lib/supabase/server'
import AiSettingsClient from './AiSettingsClient'

const DEFAULT_SETTINGS = {
  system_prompt: 'あなたは親切なカスタマーサポートアシスタントです。提供された情報を基に、お客様の質問に丁寧かつ正確に回答してください。答えられない場合は、担当者への連絡をお勧めください。',
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 1000,
  similarity_threshold: 0.7,
  top_k: 5,
}

export default async function AiSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = userData?.tenant_id ?? ''

  const { data: settings } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  const current = settings ?? { ...DEFAULT_SETTINGS, tenant_id: tenantId }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">AI設定</h1>
      <AiSettingsClient settings={current} />
    </div>
  )
}
