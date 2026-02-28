/**
 * SharedView page — displays a read-only view of shared YAML (5.2.11).
 *
 * URL: /share/:hash
 */
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import YamlEditor from '../components/YamlEditor/YamlEditor'
import { apiClient, type ShareInfo } from '../lib/api'

export default function SharedView() {
  const { hash } = useParams<{ hash: string }>()
  const [share, setShare] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!hash) return
    loadShare(hash)
  }, [hash])

  async function loadShare(h: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getShare(h)
      setShare(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared content')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!share) return
    try {
      await navigator.clipboard.writeText(share.yaml_content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Copy failed')
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bbdsl-primary" />
      </div>
    )
  }

  if (error || !share) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-bbdsl-error text-lg mb-4">{error ?? 'Share not found'}</p>
        <Link to="/editor" className="text-bbdsl-primary hover:underline">
          ← 前往編輯器
        </Link>
      </div>
    )
  }

  const createdDate = new Date(share.created_at).toLocaleDateString('zh-TW')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{share.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {share.author_name ? `by ${share.author_name}` : '匿名分享'}
            <span className="mx-2">·</span>
            {createdDate}
            <span className="mx-2">·</span>
            {share.views} 次查看
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50 transition"
          >
            {copied ? '已複製！' : '複製 YAML'}
          </button>
          <button
            onClick={handleCopyLink}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50 transition"
          >
            複製連結
          </button>
          <Link
            to={`/editor?shared=${share.hash}`}
            className="bg-bbdsl-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
          >
            在編輯器開啟
          </Link>
        </div>
      </div>

      {/* Read-only editor */}
      <div className="h-[calc(100vh-14rem)] border rounded-lg overflow-hidden">
        <YamlEditor
          value={share.yaml_content}
          onChange={() => {}}
          readOnly
        />
      </div>
    </div>
  )
}
