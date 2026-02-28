/**
 * Enhanced DiffViewer — color-coded bid-level comparison table.
 *
 * Sprint 5.3.9: Improved visualization with status icons, filtering, and
 * better layout.
 */
import { useState } from 'react'

interface DiffViewerProps {
  result: Record<string, unknown>
}

interface DiffCase {
  bid: string
  system_a: string
  system_b: string
  status: 'same' | 'different' | 'only_a' | 'only_b'
}

type StatusFilter = 'all' | 'same' | 'different' | 'only_a' | 'only_b'

export default function DiffViewer({ result }: DiffViewerProps) {
  const cases = (result.diff_cases as DiffCase[] | undefined) ?? []
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  if (cases.length === 0) {
    return <p className="text-gray-500 text-center py-8">無差異資料。</p>
  }

  const filtered = cases.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false
    if (search && !c.bid.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const statusConfig: Record<
    string,
    { bg: string; border: string; label: string; icon: string; textColor: string }
  > = {
    same: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      label: '相同',
      icon: '✓',
      textColor: 'text-green-700',
    },
    different: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      label: '不同',
      icon: '✗',
      textColor: 'text-red-700',
    },
    only_a: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      label: '僅 A',
      icon: 'A',
      textColor: 'text-orange-700',
    },
    only_b: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      label: '僅 B',
      icon: 'B',
      textColor: 'text-blue-700',
    },
  }

  const filterOptions: { value: StatusFilter; label: string; color: string }[] =
    [
      { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
      { value: 'same', label: '相同', color: 'bg-green-100 text-green-700' },
      {
        value: 'different',
        label: '不同',
        color: 'bg-red-100 text-red-700',
      },
      { value: 'only_a', label: '僅 A', color: 'bg-orange-100 text-orange-700' },
      { value: 'only_b', label: '僅 B', color: 'bg-blue-100 text-blue-700' },
    ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold">比較結果</h2>

        <div className="flex items-center gap-3">
          {/* Search in bids */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋叫品..."
            className="border rounded px-3 py-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-bbdsl-primary"
          />

          {/* Filter chips */}
          <div className="flex gap-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  filter === opt.value
                    ? opt.color + ' ring-2 ring-offset-1 ring-gray-300'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        顯示 {filtered.length} / {cases.length} 個叫品
      </p>

      <div className="grid grid-cols-1 gap-1.5">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 font-semibold text-sm text-gray-600 px-3 py-2 bg-gray-100 rounded">
          <span className="col-span-2">叫品</span>
          <span className="col-span-4">制度 A</span>
          <span className="col-span-4">制度 B</span>
          <span className="col-span-2 text-center">狀態</span>
        </div>

        {filtered.map((c, i) => {
          const cfg = statusConfig[c.status] ?? statusConfig.same
          return (
            <div
              key={i}
              className={`grid grid-cols-12 gap-2 text-sm p-3 rounded border ${cfg.bg} ${cfg.border}`}
            >
              <span className="col-span-2 font-mono font-bold text-gray-800">
                {formatBid(c.bid)}
              </span>
              <span className="col-span-4 text-gray-700">
                {c.system_a || (
                  <span className="text-gray-300 italic">—</span>
                )}
              </span>
              <span className="col-span-4 text-gray-700">
                {c.system_b || (
                  <span className="text-gray-300 italic">—</span>
                )}
              </span>
              <span
                className={`col-span-2 text-center font-semibold ${cfg.textColor}`}
              >
                <span className="inline-flex items-center gap-1">
                  <span>{cfg.icon}</span>
                  <span className="text-xs">{cfg.label}</span>
                </span>
              </span>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-6">
            無符合條件的叫品
          </p>
        )}
      </div>
    </div>
  )
}

/** Format a bid string with color-coded suit symbols. */
function formatBid(bid: string): string {
  return bid
    .replace(/S/g, '♠')
    .replace(/H/g, '♥')
    .replace(/D/g, '♦')
    .replace(/C/g, '♣')
}
