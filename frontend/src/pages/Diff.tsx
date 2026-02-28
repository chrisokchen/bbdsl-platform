/**
 * Enhanced Diff page — compare two conventions from Registry or pasted YAML.
 *
 * Sprint 5.3.8-9: Registry convention selector + improved visualization.
 */
import { useState, useEffect, useCallback } from 'react'
import DiffViewer from '../components/DiffViewer/DiffViewer'
import { apiClient, type Convention } from '../lib/api'

type SourceMode = 'paste' | 'registry'

interface SourceState {
  mode: SourceMode
  yaml: string
  conventionId: number | null
  conventionName: string
}

const emptySource = (): SourceState => ({
  mode: 'paste',
  yaml: '',
  conventionId: null,
  conventionName: '',
})

export default function Diff() {
  const [sourceA, setSourceA] = useState<SourceState>(emptySource())
  const [sourceB, setSourceB] = useState<SourceState>(emptySource())
  const [diffResult, setDiffResult] = useState<Record<string, unknown> | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Registry convention list for selectors
  const [conventions, setConventions] = useState<Convention[]>([])
  const [loadingConventions, setLoadingConventions] = useState(false)

  const fetchConventions = useCallback(async () => {
    setLoadingConventions(true)
    try {
      const data = await apiClient.listConventions({ page_size: 50 })
      setConventions(data.items)
    } catch {
      // ignore
    } finally {
      setLoadingConventions(false)
    }
  }, [])

  useEffect(() => {
    fetchConventions()
  }, [fetchConventions])

  async function selectConvention(conv: Convention, side: 'A' | 'B') {
    try {
      const full = await apiClient.getConvention(conv.id)
      const state: SourceState = {
        mode: 'registry',
        yaml: full.yaml_content ?? '',
        conventionId: conv.id,
        conventionName: `${conv.name} (${conv.namespace} v${conv.version})`,
      }
      if (side === 'A') setSourceA(state)
      else setSourceB(state)
    } catch {
      console.error('Failed to load convention')
    }
  }

  function switchMode(side: 'A' | 'B', mode: SourceMode) {
    const setter = side === 'A' ? setSourceA : setSourceB
    setter((prev) => ({
      ...prev,
      mode,
      yaml: mode === 'paste' ? '' : prev.yaml,
      conventionId: mode === 'paste' ? null : prev.conventionId,
      conventionName: mode === 'paste' ? '' : prev.conventionName,
    }))
  }

  async function handleCompare() {
    if (!sourceA.yaml.trim() || !sourceB.yaml.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.compareSystems(sourceA.yaml, sourceB.yaml)
      setDiffResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '比較失敗')
    } finally {
      setLoading(false)
    }
  }

  const canCompare =
    sourceA.yaml.trim() && sourceB.yaml.trim() && !loading

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">制度比較</h1>
      <p className="text-gray-600 mb-6">
        選擇 Registry 中的制度或貼入 YAML，比較叫牌制度的結構差異
      </p>

      {/* Source selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SourcePanel
          label="制度 A"
          source={sourceA}
          onYamlChange={(yaml) => setSourceA((p) => ({ ...p, yaml }))}
          onModeSwitch={(mode) => switchMode('A', mode)}
          conventions={conventions}
          onSelectConvention={(c) => selectConvention(c, 'A')}
          loadingConventions={loadingConventions}
          accentColor="blue"
        />
        <SourcePanel
          label="制度 B"
          source={sourceB}
          onYamlChange={(yaml) => setSourceB((p) => ({ ...p, yaml }))}
          onModeSwitch={(mode) => switchMode('B', mode)}
          conventions={conventions}
          onSelectConvention={(c) => selectConvention(c, 'B')}
          loadingConventions={loadingConventions}
          accentColor="purple"
        />
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className="bg-bbdsl-primary text-white px-10 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-lg font-semibold"
        >
          {loading ? '比較中...' : '比較兩份制度'}
        </button>
        {error && <p className="text-bbdsl-error text-sm mt-2">{error}</p>}
      </div>

      {/* Summary stats */}
      {diffResult && <DiffSummary result={diffResult} />}

      {/* Diff result */}
      {diffResult && <DiffViewer result={diffResult} />}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━ SourcePanel ━━━━━━━━━━━━━━━━━━━━━

interface SourcePanelProps {
  label: string
  source: SourceState
  onYamlChange: (yaml: string) => void
  onModeSwitch: (mode: SourceMode) => void
  conventions: Convention[]
  onSelectConvention: (c: Convention) => void
  loadingConventions: boolean
  accentColor: 'blue' | 'purple'
}

function SourcePanel({
  label,
  source,
  onYamlChange,
  onModeSwitch,
  conventions,
  onSelectConvention,
  loadingConventions,
  accentColor,
}: SourcePanelProps) {
  const [localSearch, setLocalSearch] = useState('')
  const borderCls =
    accentColor === 'blue' ? 'border-blue-300' : 'border-purple-300'
  const bgCls = accentColor === 'blue' ? 'bg-blue-50' : 'bg-purple-50'

  const filtered = conventions.filter(
    (c) =>
      !localSearch ||
      c.name.toLowerCase().includes(localSearch.toLowerCase()) ||
      c.namespace.toLowerCase().includes(localSearch.toLowerCase()),
  )

  return (
    <div className={`border-2 ${borderCls} rounded-lg overflow-hidden`}>
      {/* Mode tabs */}
      <div className="flex border-b">
        <button
          onClick={() => onModeSwitch('paste')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition ${
            source.mode === 'paste'
              ? `${bgCls} text-gray-800`
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          貼入 YAML
        </button>
        <button
          onClick={() => onModeSwitch('registry')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition ${
            source.mode === 'registry'
              ? `${bgCls} text-gray-800`
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          從 Registry 選擇
        </button>
      </div>

      <div className="p-3">
        <label className="block text-sm font-semibold mb-2">{label}</label>

        {source.mode === 'paste' ? (
          <textarea
            value={source.yaml}
            onChange={(e) => onYamlChange(e.target.value)}
            placeholder={`貼入${label}的 YAML...`}
            className="w-full h-56 border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bbdsl-primary"
          />
        ) : (
          <div>
            {source.conventionName && (
              <div
                className={`${bgCls} p-3 rounded-lg mb-3 flex items-center justify-between`}
              >
                <span className="text-sm font-medium">
                  ✓ {source.conventionName}
                </span>
                <button
                  onClick={() => onModeSwitch('registry')}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  更換
                </button>
              </div>
            )}
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="搜尋 convention..."
              className="w-full border rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-bbdsl-primary"
            />
            <div className="max-h-44 overflow-y-auto border rounded">
              {loadingConventions ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-bbdsl-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  找不到 Convention
                </p>
              ) : (
                filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConvention(conv)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 transition ${
                      source.conventionId === conv.id
                        ? `${bgCls} font-semibold`
                        : ''
                    }`}
                  >
                    <div className="font-medium">{conv.name}</div>
                    <div className="text-xs text-gray-400">
                      {conv.namespace} v{conv.version}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━ DiffSummary ━━━━━━━━━━━━━━━━━━━━━

interface DiffCase {
  status: 'same' | 'different' | 'only_a' | 'only_b'
}

function DiffSummary({ result }: { result: Record<string, unknown> }) {
  const cases = (result.diff_cases as DiffCase[] | undefined) ?? []
  if (cases.length === 0) return null

  const counts = { same: 0, different: 0, only_a: 0, only_b: 0 }
  for (const c of cases) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }
  const total = cases.length
  const matchRate = total > 0 ? ((counts.same / total) * 100).toFixed(1) : '0'

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-gray-50 rounded-lg p-4 text-center border">
        <div className="text-2xl font-bold text-gray-800">{total}</div>
        <div className="text-xs text-gray-500 mt-1">總叫品數</div>
      </div>
      <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
        <div className="text-2xl font-bold text-green-700">{counts.same}</div>
        <div className="text-xs text-green-600 mt-1">相同</div>
      </div>
      <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
        <div className="text-2xl font-bold text-red-700">
          {counts.different}
        </div>
        <div className="text-xs text-red-600 mt-1">不同</div>
      </div>
      <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
        <div className="text-2xl font-bold text-orange-700">
          {counts.only_a + counts.only_b}
        </div>
        <div className="text-xs text-orange-600 mt-1">僅單方有</div>
      </div>
      <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
        <div className="text-2xl font-bold text-blue-700">{matchRate}%</div>
        <div className="text-xs text-blue-600 mt-1">一致率</div>
      </div>
    </div>
  )
}
