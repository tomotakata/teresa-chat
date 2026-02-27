'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatAuthForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const endpoint = mode === 'login' ? '/api/customer/login' : '/api/customer/register'
    const body = mode === 'login' ? { email, password } : { email, password, name }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'エラーが発生しました'); return }

      if (mode === 'register') {
        setMode('login')
        setError('')
        setLoading(false)
        alert('登録が完了しました。メール認証後にログインしてください。')
        return
      }

      // ログイン成功 → セッション保存してチャットルームへ
      if (data.session?.access_token) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        await supabase.auth.setSession(data.session)
      }
      router.push(`/chat/${encodeURIComponent(slug)}/room`)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
        <button type="button"
          onClick={() => setMode('login')}
          className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          ログイン
        </button>
        <button type="button"
          onClick={() => setMode('register')}
          className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          新規登録
        </button>
      </div>

      {mode === 'register' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="山田 太郎"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="6文字以上"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {loading ? '処理中...' : mode === 'login' ? 'ログインしてチャット開始' : '登録する'}
      </button>
    </form>
  )
}
