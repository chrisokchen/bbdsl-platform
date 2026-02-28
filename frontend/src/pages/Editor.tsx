import { useState, useCallback, useRef, useEffect } from 'react'
import YamlEditor from '../components/YamlEditor/YamlEditor'
import ValidationPanel from '../components/ValidationPanel/ValidationPanel'
import BiddingTree from '../components/BiddingTree/BiddingTree'
import { apiClient } from '../lib/api'
import { createValidationWs, type ValidationReport } from '../lib/ws'

const DEFAULT_YAML = `# 在此貼入 BBDSL YAML 內容
# 或從 Registry 選擇一個 Convention 開始編輯
`

export default function Editor() {
  const [yaml, setYaml] = useState(DEFAULT_YAML)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [svgHtml, setSvgHtml] = useState<string>('')
  const [exportFormat, setExportFormat] = useState('bml')
  const wsRef = useRef<ReturnType<typeof createValidationWs> | null>(null)

  useEffect(() => {
    const ws = createValidationWs((msg) => {
      if (msg.status === 'ok') {
        setReport(msg.report)
      }
    })
    wsRef.current = ws

    return () => ws.close()
  }, [])

  const handleYamlChange = useCallback(
    (value: string) => {
      setYaml(value)
      // Debounced validation via WebSocket
      wsRef.current?.send(value)
    },
    [],
  )

  async function handlePreview() {
    try {
      const svg = await apiClient.exportDocument(yaml, 'svg')
      setSvgHtml(svg)
    } catch {
      console.error('Failed to generate SVG preview')
    }
  }

  async function handleExport() {
    try {
      const result = await apiClient.exportDocument(yaml, exportFormat)
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      console.error('Export failed')
    }
  }

  return (
    <div className="max-w-full mx-auto h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b">
        <button
          onClick={handlePreview}
          className="bg-bbdsl-secondary text-white px-4 py-1.5 rounded text-sm hover:bg-purple-700 transition"
        >
          預覽叫牌樹
        </button>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="bml">BML</option>
            <option value="bboalert">BBOalert</option>
            <option value="pbn">PBN</option>
            <option value="html">HTML</option>
            <option value="svg">SVG</option>
          </select>
          <button
            onClick={handleExport}
            className="bg-bbdsl-primary text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition"
          >
            匯出
          </button>
        </div>
      </div>

      {/* Editor + Panels */}
      <div className="flex h-full">
        {/* Left: Editor */}
        <div className="flex-1 border-r">
          <YamlEditor value={yaml} onChange={handleYamlChange} />
        </div>

        {/* Right: Validation + Preview */}
        <div className="w-96 flex flex-col overflow-auto">
          <div className="border-b p-4">
            <h3 className="font-semibold mb-2">驗證結果</h3>
            <ValidationPanel report={report} />
          </div>
          <div className="p-4 flex-1">
            <h3 className="font-semibold mb-2">叫牌樹預覽</h3>
            <BiddingTree svgHtml={svgHtml} />
          </div>
        </div>
      </div>
    </div>
  )
}
