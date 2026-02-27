'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ConversationFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete(key)
    else params.set(key, value)
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex gap-3">
      <Select
        value={searchParams.get('status') ?? 'all'}
        onValueChange={v => updateFilter('status', v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="open">オープン</SelectItem>
          <SelectItem value="resolved">解決済み</SelectItem>
          <SelectItem value="escalated">エスカレーション</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('channel') ?? 'all'}
        onValueChange={v => updateFilter('channel', v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="チャネル" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="line">LINE</SelectItem>
          <SelectItem value="email">メール</SelectItem>
          <SelectItem value="widget">Webチャット</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
