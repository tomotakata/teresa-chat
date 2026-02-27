'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Channel {
  id: string
  type: string
  name: string
  config: Record<string, string | number | boolean>
  enabled: boolean
}

interface Props {
  channels: Channel[]
  tenantId: string
  widgetEmbedCode: string
}

export default function ChannelSettingsClient({ channels, tenantId, widgetEmbedCode }: Props) {
  const [saving, setSaving] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, Record<string, string | number | boolean>>>(
    Object.fromEntries(channels.map(c => [c.type, { ...c.config, name: c.name, enabled: c.enabled }]))
  )

  const updateField = (channelType: string, key: string, value: string | number | boolean) => {
    setForms(prev => ({ ...prev, [channelType]: { ...prev[channelType], [key]: value } }))
  }

  const handleSave = async (channelType: string) => {
    setSaving(channelType)
    const form = forms[channelType] ?? {}
    const { name, enabled, ...config } = form

    const channel = channels.find(c => c.type === channelType)
    const method = channel ? 'PUT' : 'POST'
    const body = { tenantId, type: channelType, name, enabled, config }

    const res = await fetch('/api/channels', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channel ? { ...body, id: channel.id } : body),
    })

    setSaving(null)
    if (res.ok) toast.success('保存しました')
    else toast.error('保存に失敗しました')
  }

  const f = (type: string) => forms[type] ?? {}

  return (
    <Tabs defaultValue="line">
      <TabsList className="mb-6">
        <TabsTrigger value="line">LINE</TabsTrigger>
        <TabsTrigger value="email">メール</TabsTrigger>
        <TabsTrigger value="widget">Webウィジェット</TabsTrigger>
      </TabsList>

      <TabsContent value="line">
        <div className="bg-white rounded-xl border p-6 space-y-5 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">LINE公式アカウント設定</h2>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(f('line').enabled ?? true)}
                onCheckedChange={v => updateField('line', 'enabled', v)}
              />
              <span className="text-sm text-gray-600">{f('line').enabled ? '有効' : '無効'}</span>
            </div>
          </div>
          <div>
            <Label>チャネル名</Label>
            <Input className="mt-1" value={String(f('line').name ?? '')} onChange={e => updateField('line', 'name', e.target.value)} placeholder="LINE公式アカウント" />
          </div>
          <div>
            <Label>Channel Secret</Label>
            <Input className="mt-1" type="password" value={String(f('line').channel_secret ?? '')} onChange={e => updateField('line', 'channel_secret', e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </div>
          <div>
            <Label>Channel Access Token</Label>
            <Input className="mt-1" type="password" value={String(f('line').channel_access_token ?? '')} onChange={e => updateField('line', 'channel_access_token', e.target.value)} placeholder="xxxxxxxx..." />
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <p className="font-medium text-gray-700 mb-1">Webhook URL</p>
            <code className="text-indigo-600 break-all">{`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com'}/api/webhooks/line`}</code>
          </div>
          <Button onClick={() => handleSave('line')} disabled={saving === 'line'}>
            {saving === 'line' ? '保存中...' : '保存'}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="email">
        <div className="bg-white rounded-xl border p-6 space-y-5 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">メール設定 (SMTP)</h2>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(f('email').enabled ?? true)}
                onCheckedChange={v => updateField('email', 'enabled', v)}
              />
              <span className="text-sm text-gray-600">{f('email').enabled ? '有効' : '無効'}</span>
            </div>
          </div>
          {[
            { key: 'from_name', label: '送信者名', placeholder: 'サポートチーム' },
            { key: 'smtp_host', label: 'SMTPホスト', placeholder: 'smtp.gmail.com' },
            { key: 'smtp_port', label: 'SMTPポート', placeholder: '587' },
            { key: 'smtp_user', label: 'SMTPユーザー', placeholder: 'support@example.com' },
            { key: 'smtp_pass', label: 'SMTPパスワード', placeholder: '••••••••' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                className="mt-1"
                type={key.includes('pass') ? 'password' : 'text'}
                value={String(f('email')[key] ?? '')}
                onChange={e => updateField('email', key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
          <Button onClick={() => handleSave('email')} disabled={saving === 'email'}>
            {saving === 'email' ? '保存中...' : '保存'}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="widget">
        <div className="bg-white rounded-xl border p-6 space-y-5 max-w-xl">
          <h2 className="font-semibold text-gray-900">Webチャットウィジェット</h2>
          <div>
            <Label>ウィジェット名</Label>
            <Input className="mt-1" value={String(f('widget').name ?? '')} onChange={e => updateField('widget', 'name', e.target.value)} placeholder="サイトチャット" />
          </div>
          <div>
            <Label>ウェルカムメッセージ</Label>
            <Input className="mt-1" value={String(f('widget').welcome_message ?? '')} onChange={e => updateField('widget', 'welcome_message', e.target.value)} placeholder="こんにちは！何でもお気軽にご質問ください。" />
          </div>
          <Button onClick={() => handleSave('widget')} disabled={saving === 'widget'}>
            {saving === 'widget' ? '保存中...' : '保存'}
          </Button>
          <div>
            <Label>埋め込みコード</Label>
            <div className="mt-2 bg-gray-900 rounded-lg p-4">
              <code className="text-green-400 text-xs break-all whitespace-pre-wrap">{widgetEmbedCode}</code>
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(widgetEmbedCode); toast.success('コピーしました') }}>
              コピー
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
