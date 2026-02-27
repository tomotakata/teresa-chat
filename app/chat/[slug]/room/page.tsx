'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import SaveHistoryModal from './SaveHistoryModal'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggested_questions?: string[]
  status?: 'sending' | 'delivered' | 'read'
}

function getOrCreateSessionToken(): string {
  const key = 'teresa_session_token'
  let token = localStorage.getItem(key)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(key, token)
  }
  return token
}

function getDeviceFingerprint(): string {
  return [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')
}

function MessageStatus({ status }: { status?: 'sending' | 'delivered' | 'read' }) {
  if (!status) return null
  if (status === 'sending') return <span className="text-xs text-indigo-300 mt-1 self-end">送信中...</span>
  if (status === 'delivered') return (
    <span className="text-xs text-indigo-300 mt-1 self-end flex items-center gap-0.5">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      送信済み
    </span>
  )
  return (
    <span className="text-xs text-blue-300 mt-1 self-end flex items-center gap-0.5">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      <svg className="w-3 h-3 -ml-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      既読
    </span>
  )
}

export default function ChatRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = decodeURIComponent(params.slug as string)
  const resumeConvId = searchParams.get('resume')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(resumeConvId)
  const [projectName, setProjectName] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [hasChated, setHasChatted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = getOrCreateSessionToken()
    setSessionToken(token)

    fetch(`/api/chat/${slug}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token, device_fingerprint: getDeviceFingerprint() }),
    })

    fetch(`/api/projects/by-slug/${slug}`).then(r => r.json()).then(d => {
      if (d.name) setProjectName(d.name)
    })

    if (resumeConvId) {
      fetch(`/api/chat/${slug}/messages?conversation_id=${resumeConvId}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data)
        })
    }
  }, [slug, resumeConvId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent | null, overrideText?: string) {
    if (e) e.preventDefault()
    const userMsg = (overrideText ?? input).trim()
    if (!userMsg || loading || !sessionToken) return
    setInput('')

    const userMsgIndex = messages.length
    setMessages(prev => [...prev, { role: 'user', content: userMsg, status: 'sending' }])
    setLoading(true)

    // 送信済みアニメーション
    setTimeout(() => {
      setMessages(prev => prev.map((m, i) =>
        i === userMsgIndex ? { ...m, status: 'delivered' } : m
      ))
    }, 400)

    try {
      const res = await fetch(`/api/chat/${slug}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, conversation_id: convId, session_token: sessionToken }),
      })
      const data = await res.json()

      // 既読に更新
      setMessages(prev => prev.map((m, i) =>
        i === userMsgIndex ? { ...m, status: 'read' } : m
      ))

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `エラー: ${data.error ?? res.status}` }])
        return
      }
      if (data.conversation_id) setConvId(data.conversation_id)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          suggested_questions: Array.isArray(data.suggested_questions) ? data.suggested_questions : [],
        },
      ])
      if (!hasChated) {
        setHasChatted(true)
        setTimeout(() => setShowSaveModal(true), 30000)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{projectName || 'チャットサポート'}</p>
            <p className="text-xs text-green-500">● オンライン</p>
          </div>
        </div>
        <button onClick={() => setShowSaveModal(true)}
          className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
          履歴を保存
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">メッセージを入力してチャットを開始してください</p>
            <p className="text-xs mt-1 text-gray-300">※ログイン不要でご利用できます</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-indigo-600 text-xs font-bold">AI</span>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
            {m.role === 'user' && <MessageStatus status={m.status} />}
            {m.role === 'assistant' && m.suggested_questions && m.suggested_questions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 ml-10">
                {m.suggested_questions.map((q, qi) => (
                  <button
                    key={qi}
                    onClick={() => sendMessage(null, q)}
                    disabled={loading}
                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1.5 hover:bg-indigo-100 transition-colors disabled:opacity-50 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-indigo-600 text-xs font-bold">AI</span>
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      {showSaveModal && (
        <SaveHistoryModal
          sessionToken={sessionToken}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  )
}
