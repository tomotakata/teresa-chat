'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface AiSettings {
  id?: string
  tenant_id: string
  system_prompt: string
  model: string
  temperature: number
  max_tokens: number
  similarity_threshold: number
  top_k: number
}

export default function AiSettingsClient({ settings }: { settings: AiSettings }) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) toast.success('AI設定を保存しました')
    else toast.error('保存に失敗しました')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">AIモデル設定</h2>

        <div>
          <Label>モデル</Label>
          <Select value={form.model} onValueChange={v => update('model', v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o (推奨)</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o mini (高速・低コスト)</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Temperature: {form.temperature}</Label>
          <input
            type="range" min={0} max={1} step={0.1}
            value={form.temperature}
            onChange={e => update('temperature', parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>安定 (0)</span><span>創造的 (1)</span>
          </div>
        </div>

        <div>
          <Label>最大トークン数: {form.max_tokens}</Label>
          <input
            type="range" min={200} max={4000} step={100}
            value={form.max_tokens}
            onChange={e => update('max_tokens', parseInt(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        <div>
          <Label>類似度閾値: {form.similarity_threshold}</Label>
          <input
            type="range" min={0.3} max={1.0} step={0.05}
            value={form.similarity_threshold}
            onChange={e => update('similarity_threshold', parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
          <p className="text-xs text-gray-400 mt-1">高いほど厳密にナレッジベースから回答</p>
        </div>

        <div>
          <Label>参照チャンク数 (Top-K): {form.top_k}</Label>
          <input
            type="range" min={1} max={10} step={1}
            value={form.top_k}
            onChange={e => update('top_k', parseInt(e.target.value))}
            className="mt-1 w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">システムプロンプト</h2>
        <Textarea
          value={form.system_prompt}
          onChange={e => update('system_prompt', e.target.value)}
          className="min-h-[180px] font-mono text-sm"
          placeholder="AIの役割・口調・制約などを記述してください..."
        />
        <p className="text-xs text-gray-400">
          ヒント: 「〇〇株式会社のサポートとして、丁寧な敬語で回答してください。答えられない場合は担当者への連絡を促してください。」
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? '保存中...' : '設定を保存'}
      </Button>
    </div>
  )
}
