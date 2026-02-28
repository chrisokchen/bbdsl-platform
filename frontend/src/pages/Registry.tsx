import { useState, useEffect } from 'react'
import { apiClient, type Convention } from '../lib/api'

export default function Registry() {
  const [conventions, setConventions] = useState<Convention[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchConventions()
  }, [page])

  async function fetchConventions() {
    setLoading(true)
    try {
      const data = await apiClient.listConventions({
        q: query || undefined,
        page,
      })
      setConventions(data.items)
      setTotal(data.total)
    } catch {
      console.error('Failed to fetch conventions')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchConventions()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Convention Registry</h1>
        <p className="text-gray-600">
          瀏覽、搜尋並安裝橋牌叫牌制度模組
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8 flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋 Convention 名稱或 namespace..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-bbdsl-primary"
        />
        <button
          type="submit"
          className="bg-bbdsl-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          搜尋
        </button>
      </form>

      {/* Results */}
      {loading ? (
        <p className="text-gray-500">載入中...</p>
      ) : conventions.length === 0 ? (
        <p className="text-gray-500">尚無 Convention。上傳您的第一個制度檔案吧！</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {conventions.map((conv) => (
              <div
                key={conv.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold text-bbdsl-primary">
                  {conv.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {conv.namespace} v{conv.version}
                </p>
                {conv.description && (
                  <p className="text-gray-600 mt-2 text-sm">
                    {conv.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                  <span>by {conv.author_name}</span>
                  <span>{conv.downloads} downloads</span>
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
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              上一頁
            </button>
            <span className="text-sm text-gray-600">
              第 {page} 頁（共 {Math.ceil(total / 20)} 頁）
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </>
      )}
    </div>
  )
}
