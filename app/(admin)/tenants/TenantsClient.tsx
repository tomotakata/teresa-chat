'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

export default function TenantsClient({ tenants }: { tenants: Tenant[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name || !slug || !adminEmail || !adminPass) {
      toast.error('すべての項目を入力してください')
      return
    }
    setLoading(true)
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, adminEmail, adminPass }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error ?? '作成に失敗しました'); return }
    toast.success('テナントを作成しました')
    setOpen(false)
    setName(''); setSlug(''); setAdminEmail(''); setAdminPass('')
    router.refresh()
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>新規テナント作成</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規テナント作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>企業名</Label>
                <Input className="mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="株式会社サンプル" />
              </div>
              <div>
                <Label>スラッグ (URL用)</Label>
                <Input className="mt-1" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="sample-corp" />
              </div>
              <div>
                <Label>管理者メール</Label>
                <Input className="mt-1" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
              </div>
              <div>
                <Label>管理者パスワード</Label>
                <Input className="mt-1" type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="8文字以上" />
              </div>
              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? '作成中...' : '作成'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">企業名</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">スラッグ</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">プラン</th>
              <th className="text-left px-6 py-3 text-gray-600 font-medium">作成日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 text-gray-500">{t.slug}</td>
                <td className="px-6 py-4">
                  <Badge variant="outline">{t.plan}</Badge>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(t.created_at).toLocaleDateString('ja-JP')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tenants.length === 0 && (
          <div className="p-12 text-center text-gray-500">テナントがありません</div>
        )}
      </div>
    </div>
  )
}
