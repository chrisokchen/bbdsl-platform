/**
 * User Profile page — published conventions, drafts, activity, recommendations.
 *
 * Sprint 5.3.12: Full user profile with personal data and activity.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  apiClient,
  type Convention,
  type Draft,
  type RecommendationItem,
} from '../lib/api'

type Tab = 'conventions' | 'drafts' | 'recommendations'

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('conventions')
  const [conventions, setConventions] = useState<Convention[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [recommendations, setRecommendations] = useState<
    RecommendationItem[]
  >([])
  const [loading, setLoading] = useState(false)

  const loadConventions = useCallback(async () => {
    setLoading(true)
    try {
      // Filter by current user's name
      const data = await apiClient.listConventions({
        author: user?.name,
        page_size: 50,
      })
      setConventions(data.items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user?.name])

  const loadDrafts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.listDrafts({ page_size: 50 })
      setDrafts(data.items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.getRecommendations(10)
      setRecommendations(data.items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    if (tab === 'conventions') loadConventions()
    else if (tab === 'drafts') loadDrafts()
    else if (tab === 'recommendations') loadRecommendations()
  }, [
    tab,
    isAuthenticated,
    loadConventions,
    loadDrafts,
    loadRecommendations,
  ])

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">個人頁面</h1>
        <p className="text-gray-600 mb-8">
          管理您發布的 Convention、已安裝的模組與活動記錄。
        </p>

        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-4">
            請先登入以使用個人頁面功能。
          </p>
          <p className="text-sm text-gray-400">
            使用右上角的「Login」按鈕以 GitHub 或 Google 登入
          </p>
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conventions', label: '我的 Convention' },
    { key: 'drafts', label: '草稿' },
    { key: 'recommendations', label: '推薦' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* User header */}
      <div className="flex items-center gap-6 mb-8">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-20 h-20 rounded-full border-2 border-gray-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-bbdsl-primary text-white flex items-center justify-center text-3xl font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
          {user?.email && (
            <p className="text-gray-500 text-sm">{user.email}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>{conventions.length} Convention(s)</span>
            <span>{drafts.length} Draft(s)</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 border border-gray-300 px-4 py-1.5 rounded transition hover:border-red-300"
        >
          登出
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
              tab === t.key
                ? 'border-bbdsl-primary text-bbdsl-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bbdsl-primary" />
        </div>
      ) : (
        <>
          {tab === 'conventions' && (
            <ConventionsTab conventions={conventions} />
          )}
          {tab === 'drafts' && <DraftsTab drafts={drafts} />}
          {tab === 'recommendations' && (
            <RecommendationsTab items={recommendations} />
          )}
        </>
      )}
    </div>
  )
}

// ━━━━━━━━━━ Sub-components ━━━━━━━━━━

function ConventionsTab({ conventions }: { conventions: Convention[] }) {
  if (conventions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">
          您尚未發布任何 Convention。
        </p>
        <Link
          to="/editor"
          className="text-bbdsl-primary hover:underline"
        >
          前往編輯器建立您的第一個制度 →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {conventions.map((conv) => (
        <Link
          key={conv.id}
          to={`/conventions/${conv.id}`}
          className="block bg-white rounded-lg border p-5 hover:shadow-md hover:border-bbdsl-primary/30 transition group"
        >
          <h3 className="font-semibold text-bbdsl-primary group-hover:underline">
            {conv.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {conv.namespace} v{conv.version}
          </p>
          {conv.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {conv.description}
            </p>
          )}
          <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
            <span>{conv.downloads} 次下載</span>
            <span>
              {new Date(conv.updated_at).toLocaleDateString('zh-TW')}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function DraftsTab({ drafts }: { drafts: Draft[] }) {
  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">
          您尚未儲存任何草稿。
        </p>
        <Link
          to="/editor"
          className="text-bbdsl-primary hover:underline"
        >
          前往編輯器開始撰寫 →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <Link
          key={draft.id}
          to={`/editor?draft=${draft.id}`}
          className="block bg-white rounded-lg border p-4 hover:shadow-sm hover:border-bbdsl-primary/30 transition"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-800">{draft.title}</h3>
            <span className="text-xs text-gray-400">
              {new Date(draft.updated_at).toLocaleDateString('zh-TW', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono line-clamp-1">
            {draft.yaml_content.substring(0, 120)}...
          </p>
        </Link>
      ))}
    </div>
  )
}

function RecommendationsTab({
  items,
}: {
  items: RecommendationItem[]
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          暫無推薦。發布更多 Convention 或探索 Registry 以獲得個人化推薦。
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <Link
          key={item.id}
          to={`/conventions/${item.id}`}
          className="block bg-white rounded-lg border p-5 hover:shadow-md hover:border-bbdsl-primary/30 transition group"
        >
          <h3 className="font-semibold text-bbdsl-primary group-hover:underline">
            {item.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {item.namespace} v{item.version} · by {item.author_name}
          </p>
          {item.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
            <span>{item.downloads} 次下載</span>
            {item.avg_rating !== null && (
              <span className="text-yellow-600">
                ★ {item.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
