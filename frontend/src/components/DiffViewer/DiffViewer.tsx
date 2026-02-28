interface DiffViewerProps {
  result: Record<string, unknown>
}

interface DiffCase {
  bid: string
  system_a: string
  system_b: string
  status: 'same' | 'different' | 'only_a' | 'only_b'
}

export default function DiffViewer({ result }: DiffViewerProps) {
  const cases = (result.diff_cases as DiffCase[] | undefined) ?? []

  if (cases.length === 0) {
    return <p className="text-gray-500">無差異資料。</p>
  }

  const statusColor: Record<string, string> = {
    same: 'bg-green-50 border-green-300',
    different: 'bg-red-50 border-red-300',
    only_a: 'bg-orange-50 border-orange-300',
    only_b: 'bg-blue-50 border-blue-300',
  }

  const statusLabel: Record<string, string> = {
    same: '相同',
    different: 'HCP 不同',
    only_a: '僅制度 A',
    only_b: '僅制度 B',
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">比較結果</h2>
      <div className="grid grid-cols-1 gap-2">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 font-semibold text-sm text-gray-600 px-3">
          <span>叫品</span>
          <span>制度 A</span>
          <span>制度 B</span>
          <span>狀態</span>
        </div>

        {cases.map((c, i) => (
          <div
            key={i}
            className={`grid grid-cols-4 gap-2 text-sm p-3 rounded border ${statusColor[c.status] ?? ''}`}
          >
            <span className="font-mono font-semibold">{c.bid}</span>
            <span>{c.system_a || '—'}</span>
            <span>{c.system_b || '—'}</span>
            <span className="text-xs">
              {statusLabel[c.status] ?? c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
