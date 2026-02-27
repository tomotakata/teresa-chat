'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function EscalateButton({
  conversationId,
  currentStatus,
}: {
  conversationId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResolve = async () => {
    setLoading(true)
    await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId, status: 'resolved' }),
    })
    setLoading(false)
    toast.success('解決済みにしました')
    router.refresh()
  }

  const handleEscalate = async () => {
    setLoading(true)
    await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId, status: 'escalated', escalated_to: email }),
    })
    setLoading(false)
    setOpen(false)
    toast.success('エスカレーションしました')
    router.refresh()
  }

  if (currentStatus !== 'open') return null

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleResolve} disabled={loading}>
        解決済み
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">エスカレーション</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>担当者にエスカレーション</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="担当者のメールアドレス"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Button onClick={handleEscalate} disabled={!email || loading} className="w-full">
              {loading ? '処理中...' : 'エスカレーション'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
