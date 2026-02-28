import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiClient, type Convention, type VersionInfo } from '../lib/api'
import CommunitySection from '../components/CommunitySection/CommunitySection'

export default function ConventionDetail() {
  const { id } = useParams<{ id: string }>()
  const [conv, setConv] = useState<Convention | null>(null)
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [yamlExpanded, setYamlExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    loadConvention(Number(id))
  }, [id])

  async function loadConvention(convId: number) {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getConvention(convId)
      setConv(data)
      // Load version history for this namespace
      try {
        const vers = await apiClient.listVersions(data.namespace)
        setVersions(vers)
      } catch {
        // version listing may fail if namespace has no other versions
        setVersions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load convention')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!conv) return
    setDownloading(true)
    try {
      await apiClient.downloadConvention(conv.id)
      // Download the YAML as a file
      const blob = new Blob([conv.yaml_content ?? ''], {
        type: 'text/yaml;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${conv.namespace}-v${conv.version}.bbdsl.yaml`
      a.click()
      URL.revokeObjectURL(url)
      // Refresh to show updated download count
      await loadConvention(conv.id)
    } catch {
      console.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopyYaml() {
    if (!conv?.yaml_content) return
    try {
      await navigator.clipboard.writeText(conv.yaml_content)
    } catch {
      console.error('Copy failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bbdsl-primary" />
      </div>
    )
  }

  if (error || !conv) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-bbdsl-error text-lg mb-4">{error ?? 'Convention not found'}</p>
        <Link to="/" className="text-bbdsl-primary hover:underline">
          ← 返回 Registry
        </Link>
      </div>
    )
  }

  const tags = conv.tags ? conv.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const createdDate = new Date(conv.created_at).toLocaleDateString('zh-TW')
  const updatedDate = new Date(conv.updated_at).toLocaleDateString('zh-TW')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-bbdsl-primary">
          Registry
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{conv.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{conv.name}</h1>
          <p className="text-gray-500 mt-1">
            <span className="font-mono">{conv.namespace}</span>
            <span className="mx-2">·</span>
            v{conv.version}
            <span className="mx-2">·</span>
            by {conv.author_name}
          </p>
          {conv.description && (
            <p className="text-gray-600 mt-3">{conv.description}</p>
          )}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/?tag=${encodeURIComponent(tag)}`}
                  className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded hover:bg-blue-200 transition"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 md:items-end shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-bbdsl-primary text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloading ? '下載中...' : '下載 YAML'}
          </button>
          <span className="text-xs text-gray-400">{conv.downloads} 次下載</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main: YAML preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-800">YAML 內容</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyYaml}
                  className="text-xs text-gray-500 hover:text-bbdsl-primary border px-3 py-1 rounded transition"
                >
                  複製
                </button>
                <button
                  onClick={() => setYamlExpanded(!yamlExpanded)}
                  className="text-xs text-gray-500 hover:text-bbdsl-primary border px-3 py-1 rounded transition"
                >
                  {yamlExpanded ? '收合' : '展開'}
                </button>
              </div>
            </div>
            <pre
              className={`p-4 text-sm font-mono text-gray-800 overflow-x-auto bg-gray-50 ${
                yamlExpanded ? '' : 'max-h-96 overflow-y-auto'
              }`}
            >
              {conv.yaml_content ?? '(YAML 內容未載入)'}
            </pre>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info card */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">資訊</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Namespace</dt>
                <dd className="font-mono text-gray-800">{conv.namespace}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">版本</dt>
                <dd className="text-gray-800">v{conv.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">作者</dt>
                <dd className="text-gray-800">{conv.author_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">下載數</dt>
                <dd className="text-gray-800">{conv.downloads}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">建立日期</dt>
                <dd className="text-gray-800">{createdDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">最後更新</dt>
                <dd className="text-gray-800">{updatedDate}</dd>
              </div>
            </dl>
          </div>

          {/* Version history */}
          {versions.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">版本歷史</h3>
              <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {versions.map((v) => (
                  <li
                    key={v.version}
                    className={`flex items-center justify-between py-1.5 px-2 rounded ${
                      v.version === conv.version
                        ? 'bg-blue-50 text-bbdsl-primary font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>v{v.version}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(v.created_at).toLocaleDateString('zh-TW')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">快捷操作</h3>
            <div className="space-y-2">
              <Link
                to={`/editor?convention=${conv.id}`}
                className="block w-full text-center bg-bbdsl-secondary text-white py-2 rounded hover:bg-purple-700 transition text-sm"
              >
                在線上編輯器開啟
              </Link>
              <button
                onClick={() => {
                  const installCmd = `bbdsl registry install ${conv.namespace}@${conv.version}`
                  navigator.clipboard.writeText(installCmd).catch(() => {})
                }}
                className="block w-full text-center border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 transition text-sm"
              >
                複製安裝指令
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Community: Ratings + Comments */}
      <CommunitySection conventionId={conv.id} />
    </div>
  )
}
