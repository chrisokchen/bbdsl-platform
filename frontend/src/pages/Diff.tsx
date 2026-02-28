import { useState } from 'react'
import DiffViewer from '../components/DiffViewer/DiffViewer'
import { apiClient } from '../lib/api'

export default function Diff() {
  const [yamlA, setYamlA] = useState('')
  const [yamlB, setYamlB] = useState('')
  const [diffResult, setDiffResult] = useState<Record<string, unknown> | null>(
    null,
  )
  const [loading, setLoading] = useState(false)

  async function handleCompare() {
    if (!yamlA.trim() || !yamlB.trim()) return
    setLoading(true)
    try {
      const result = await apiClient.compareSystems(yamlA, yamlB)
      setDiffResult(result)
    } catch {
      console.error('Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">制度比較</h1>
      <p className="text-gray-600 mb-6">
        貼入兩份 BBDSL YAML，比較叫牌制度的結構差異
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">制度 A</label>
          <textarea
            value={yamlA}
            onChange={(e) => setYamlA(e.target.value)}
            placeholder="貼入制度 A 的 YAML..."
            className="w-full h-64 border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bbdsl-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">制度 B</label>
          <textarea
            value={yamlB}
            onChange={(e) => setYamlB(e.target.value)}
            placeholder="貼入制度 B 的 YAML..."
            className="w-full h-64 border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bbdsl-primary"
          />
        </div>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleCompare}
          disabled={loading || !yamlA.trim() || !yamlB.trim()}
          className="bg-bbdsl-primary text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? '比較中...' : '比較兩份制度'}
        </button>
      </div>

      {diffResult && <DiffViewer result={diffResult} />}
    </div>
  )
}
