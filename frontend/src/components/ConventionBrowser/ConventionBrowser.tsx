/**
 * ConventionBrowser — left panel in the editor for browsing Registry
 * conventions and inserting `use_conventions:` blocks (5.2.9).
 */
import { useState, useEffect, useCallback } from 'react'
import { apiClient, type Convention } from '../../lib/api'

interface ConventionBrowserProps {
  /** Called when the user clicks "Insert" on a convention. */
  onInsert: (yamlSnippet: string) => void
}

export default function ConventionBrowser({ onInsert }: ConventionBrowserProps) {
  const [conventions, setConventions] = useState<Convention[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchConventions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.listConventions({
        q: query || undefined,
        page_size: 50,
      })
      setConventions(data.items)
    } catch {
      console.error('Failed to fetch conventions')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchConventions()
  }, [fetchConventions])

  function handleInsert(conv: Convention) {
    const snippet = [
      `# --- Inserted from Registry: ${conv.name} ---`,
      `use_conventions:`,
      `  - namespace: "${conv.namespace}"`,
      `    version: "${conv.version}"`,
      '',
    ].join('\n')
    onInsert(snippet)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm mb-2">Convention 瀏覽</h3>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋..."
          className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-bbdsl-primary"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-bbdsl-primary" />
          </div>
        ) : conventions.length === 0 ? (
          <p className="text-xs text-gray-400 p-3">
            {query ? '找不到符合的 Convention' : '尚無 Convention'}
          </p>
        ) : (
          <ul className="divide-y">
            {conventions.map((conv) => (
              <li key={conv.id} className="px-3 py-2">
                <button
                  onClick={() =>
                    setExpanded(expanded === conv.id ? null : conv.id)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-bbdsl-primary truncate">
                      {conv.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-1 shrink-0">
                      v{conv.version}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.namespace}
                  </p>
                </button>

                {expanded === conv.id && (
                  <div className="mt-2 space-y-2">
                    {conv.description && (
                      <p className="text-xs text-gray-600">
                        {conv.description}
                      </p>
                    )}
                    <button
                      onClick={() => handleInsert(conv)}
                      className="w-full bg-bbdsl-primary text-white text-xs py-1.5 rounded hover:bg-blue-700 transition"
                    >
                      插入 use_conventions
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
