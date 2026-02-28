import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, type Convention } from '../lib/api'

const SORT_OPTIONS = [
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最舊' },
  { value: 'downloads', label: '下載數' },
  { value: 'name', label: '名稱' },
]

export default function Registry() {
  const [conventions, setConventions] = useState<Convention[]>([])
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Collect all unique tags across results for the filter chips
  const allTags = Array.from(
    new Set(
      conventions
        .flatMap((c) => (c.tags ? c.tags.split(',').map((t) => t.trim()) : []))
        .filter(Boolean),
    ),
  ).sort()

  const fetchConventions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.listConventions({
        q: query || undefined,
        tag: tagFilter || undefined,
        sort,
        page,
        page_size: pageSize,
      })
      setConventions(data.items)
      setTotal(data.total)
    } catch {
      console.error('Failed to fetch conventions')
    } finally {
      setLoading(false)
    }
  }, [query, tagFilter, sort, page])

  useEffect(() => {
    fetchConventions()
  }, [fetchConventions])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  function handleTagClick(tag: string) {
    setTagFilter(tagFilter === tag ? '' : tag)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Convention Registry</h1>
        <p className="text-gray-600">
          瀏覽、搜尋並安裝橋牌叫牌制度模組
        </p>
      </div>

      {/* Search + Sort bar */}
      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋 Convention 名稱或 namespace..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-bbdsl-primary"
        />
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value)
            setPage(1)
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              排序：{o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-bbdsl-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          搜尋
        </button>
      </form>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 leading-6">標籤篩選：</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                tagFilter === tag
                  ? 'bg-bbdsl-primary text-white border-bbdsl-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-bbdsl-primary hover:text-bbdsl-primary'
              }`}
            >
              {tag}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => {
                setTagFilter('')
                setPage(1)
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
            >
              清除
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bbdsl-primary" />
        </div>
      ) : conventions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">
            {query || tagFilter
              ? '找不到符合條件的 Convention'
              : '尚無 Convention。上傳您的第一個制度檔案吧！'}
          </p>
          {(query || tagFilter) && (
            <button
              onClick={() => {
                setQuery('')
                setTagFilter('')
                setPage(1)
              }}
              className="text-bbdsl-primary hover:underline text-sm"
            >
              清除搜尋條件
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            共 {total} 個結果
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {conventions.map((conv) => (
              <Link
                key={conv.id}
                to={`/conventions/${conv.id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-bbdsl-primary/30 transition group"
              >
                <h3 className="text-lg font-semibold text-bbdsl-primary group-hover:underline">
                  {conv.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {conv.namespace} v{conv.version}
                </p>
                {conv.description && (
                  <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                    {conv.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                  <span>by {conv.author_name}</span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {conv.downloads}
                  </span>
                </div>
                {conv.tags && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {conv.tags.split(',').map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <span className="text-sm text-gray-600">
              第 {page} 頁（共 {totalPages} 頁）
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              下一頁
            </button>
          </div>
        </>
      )}
    </div>
  )
}
