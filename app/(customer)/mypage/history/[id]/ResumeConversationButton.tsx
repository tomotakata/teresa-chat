'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResumeConversationButton({ conversationId }: { conversationId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleResume() {
    setLoading(true)
    try {
      // ステータスを open に戻す
      const res = await fetch(`/api/customer/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      })
      if (!res.ok) { setLoading(false); return }

      // 会話のプロジェクトslugを取得してチャットルームへ
      const conv = await res.json()
      const projRes = await fetch(`/api/customer/conversations/${conversationId}`)
      const projData = await projRes.json()
      const slug = projData?.projects?.slug

      if (slug) {
        // 既存会話IDを持ってチャットルームへ
        router.push(`/chat/${encodeURIComponent(slug)}/room?resume=${conversationId}`)
      } else {
        router.refresh()
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleResume} disabled={loading}
      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )}
      問い合わせを再開する
    </button>
  )
}
