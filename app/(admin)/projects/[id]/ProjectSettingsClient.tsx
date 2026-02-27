'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Doc { id: string; title: string; status: string; chunk_count: number | null; created_at: string }
interface Project {
  id: string; name: string; description: string | null
  welcome_message: string; is_active: boolean; doc_ids: string[] | null
}

export default function ProjectSettingsClient({ project, docs }: { project: Project; docs: Doc[] }) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [welcomeMessage, setWelcomeMessage] = useState(project.welcome_message)
  const [isActive, setIsActive] = useState(project.is_active)
  const [selectedDocs, setSelectedDocs] = useState<string[]>(project.doc_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggleDoc(docId: string) {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, welcome_message: welcomeMessage,
          is_active: isActive, doc_ids: selectedDocs,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) return
    setDeleting(true)
    try {
      await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      router.push('/projects')
    } catch {
      setError('削除に失敗しました')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 基本設定 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">基本設定</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクト名</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ウェルカムメッセージ</label>
            <textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-indigo-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700">{isActive ? 'チャット公開中' : 'チャット非公開'}</span>
          </div>

          {/* 使用する資料の選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              使用する資料
              <span className="ml-2 text-xs text-gray-400 font-normal">（未選択の場合はすべての資料を使用）</span>
            </label>
            {docs.length === 0 ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-3 text-center">
                資料がありません。ナレッジ管理からアップロードしてください。
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {docs.map(doc => (
                  <label key={doc.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedDocs.includes(doc.id) ? 'bg-indigo-50' : ''}`}>
                    <input type="checkbox"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500">
                        {doc.chunk_count ?? 0} チャンク ·
                        <span className={`ml-1 ${doc.status === 'ready' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {doc.status === 'ready' ? '学習済み' : doc.status}
                        </span>
                      </p>
                    </div>
                    {selectedDocs.includes(doc.id) && (
                      <span className="text-indigo-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {selectedDocs.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1">{selectedDocs.length} 件の資料を選択中</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
              {deleting ? '削除中...' : 'このプロジェクトを削除'}
            </button>
            <button type="submit" disabled={saving}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '保存中...' : saved ? '✓ 保存しました' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
