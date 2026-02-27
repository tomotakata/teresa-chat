'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CloseConversationButton({ conversationId }: { conversationId: string }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  async function handleClose() {
    setLoading(true)
    try {
      const res = await fetch(`/api/customer/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (res.ok) {
        setShowConfirm(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">対応終了にしますか？</span>
        <button onClick={handleClose} disabled={loading}
          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium">
          {loading ? '処理中...' : '終了する'}
        </button>
        <button onClick={() => setShowConfirm(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">
          キャンセル
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setShowConfirm(true)}
      className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
      対応終了にする
    </button>
  )
}
