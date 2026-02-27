'use client'
import { useState } from 'react'

interface Props {
  chatUrl: string
  projectId: string
  projectSlug: string
}

export default function ChatUrlBox({ chatUrl, projectId }: Props) {
  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(chatUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2 mb-4">
        <code className="flex-1 text-sm text-indigo-700 font-mono break-all">{chatUrl}</code>
        <button
          onClick={copyUrl}
          className="flex-shrink-0 text-xs bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600">コピー済</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-600">コピー</span>
            </>
          )}
        </button>
        <a href={chatUrl} target="_blank"
          className="flex-shrink-0 text-xs text-indigo-600 hover:underline whitespace-nowrap">
          開く →
        </a>
      </div>
      <div className="flex gap-2 flex-wrap">
        <a href={`/api/projects/${projectId}/qrcode?format=png`}
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors" download>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          QR PNG ダウンロード
        </a>
        <a href={`/api/projects/${projectId}/qrcode?format=pdf`} target="_blank"
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          印刷用PDF
        </a>
      </div>
    </div>
  )
}
