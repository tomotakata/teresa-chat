'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface Props {
  sessionToken: string
  onClose: () => void
}

export default function SaveHistoryModal({ sessionToken, onClose }: Props) {
  const [mode, setMode] = useState<'choice' | 'email' | 'done'>('choice')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLogin, setIsLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!isLogin) {
        // 新規登録
        const res = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error); return }
      }
      // ログイン
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error); return }

      if (d.session) {
        const supabase = getSupabase()
        await supabase.auth.setSession(d.session)
      }

      // 匿名セッションとアカウントを紐付け
      await fetch('/api/customer/link-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, customer_id: d.customer?.id }),
      })

      setMode('done')
    } catch {
      setError('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    const supabase = getSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/customer/oauth-callback?session_token=${sessionToken}`,
      },
    })
  }

  if (mode === 'done') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">保存しました！</h2>
          <p className="text-gray-500 mb-6 text-sm">マイページでチャット履歴をいつでも確認できます。</p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              チャットに戻る
            </button>
            <a href="/mypage/history"
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 text-center">
              履歴を見る
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'email') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setMode('choice')} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="font-bold text-gray-900">{isLogin ? 'ログイン' : '新規登録'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-5">
            <button type="button" onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium ${!isLogin ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
              新規登録
            </button>
            <button type="button" onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium ${isLogin ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>
              ログイン
            </button>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {!isLogin && (
              <input type="text" placeholder="お名前（任意）" value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            )}
            <input type="email" required placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="password" required placeholder="パスワード（6文字以上）" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? '処理中...' : isLogin ? 'ログインして保存' : '登録して保存'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">チャット履歴を保存しますか？</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-500 mb-6">アカウントを作成すると、今後のお問い合わせ履歴をいつでも確認できます。</p>

        <div className="space-y-3">
          {/* Google */}
          <button onClick={handleGoogle}
            className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Google で登録 / ログイン</span>
          </button>

          {/* LINE */}
          <button disabled
            className="w-full flex items-center gap-3 bg-[#06C755] rounded-xl px-4 py-3.5 opacity-40 cursor-not-allowed">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 5.48 2 9.5c0 2.48 1.35 4.67 3.44 6.06L4.5 19l3.58-1.87c1.26.35 2.57.53 3.92.53 5.52 0 10-3.48 10-7.5S17.52 2 12 2z"/>
            </svg>
            <span className="text-sm font-medium text-white">LINE で登録（準備中）</span>
          </button>

          {/* Email */}
          <button onClick={() => setMode('email')}
            className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">メールアドレスで登録 / ログイン</span>
          </button>

          <button onClick={onClose} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
            今は保存しない
          </button>
        </div>
      </div>
    </div>
  )
}
