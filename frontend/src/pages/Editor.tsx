import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import YamlEditor from '../components/YamlEditor/YamlEditor'
import ValidationPanel from '../components/ValidationPanel/ValidationPanel'
import BiddingTree from '../components/BiddingTree/BiddingTree'
import ConventionBrowser from '../components/ConventionBrowser/ConventionBrowser'
import { apiClient } from '../lib/api'
import { createValidationWs, type ValidationReport } from '../lib/ws'

const DEFAULT_YAML = `# 在此貼入 BBDSL YAML 內容
# 或從左側 Registry 瀏覽面板選擇一個 Convention 開始編輯
`

export default function Editor() {
  const [searchParams] = useSearchParams()
  const [yaml, setYaml] = useState(DEFAULT_YAML)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [svgHtml, setSvgHtml] = useState<string>('')
  const [exportFormat, setExportFormat] = useState('bml')
  const [showBrowser, setShowBrowser] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const wsRef = useRef<ReturnType<typeof createValidationWs> | null>(null)
  const svgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load content from URL params (convention or share) ──
  useEffect(() => {
    const conventionId = searchParams.get('convention')
    const sharedHash = searchParams.get('shared')

    if (conventionId) {
      apiClient
        .getConvention(Number(conventionId))
        .then((conv) => {
          if (conv.yaml_content) setYaml(conv.yaml_content)
        })
        .catch(() => console.error('Failed to load convention'))
    } else if (sharedHash) {
      apiClient
        .getShare(sharedHash)
        .then((share) => setYaml(share.yaml_content))
        .catch(() => console.error('Failed to load shared content'))
    }
  }, [searchParams])

  // ── WebSocket validation connection ──
  useEffect(() => {
    const ws = createValidationWs((msg) => {
      if (msg.status === 'ok') {
        setReport(msg.report)
      }
    })
    wsRef.current = ws

    return () => ws.close()
  }, [])

  // ── Handle YAML changes — validate + auto-preview SVG (5.2.8) ──
  const handleYamlChange = useCallback(
    (value: string) => {
      setYaml(value)
      // Send to WebSocket for validation (debounced inside ws client)
      wsRef.current?.send(value)

      // Auto-update SVG preview after 1.5s of inactivity
      if (svgTimerRef.current) clearTimeout(svgTimerRef.current)
      svgTimerRef.current = setTimeout(async () => {
        try {
          const svg = await apiClient.exportDocument(value, 'svg')
          setSvgHtml(svg)
        } catch {
          // Silently ignore preview errors during editing
        }
      }, 1500)
    },
    [],
  )

  // ── Convention insertion (5.2.9) ──
  function handleConventionInsert(snippet: string) {
    setYaml((prev) => prev + '\n' + snippet)
  }

  // ── Manual SVG preview ──
  async function handlePreview() {
    try {
      const svg = await apiClient.exportDocument(yaml, 'svg')
      setSvgHtml(svg)
    } catch {
      console.error('Failed to generate SVG preview')
    }
  }

  // ── Export (5.2.10) ──
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

  // ── Draft save (5.2.3) ──
  async function handleSaveDraft() {
    setSaving(true)
    try {
      await apiClient.createDraft('Untitled Draft', yaml)
      setSaving(false)
      setShareStatus('草稿已儲存！')
      setTimeout(() => setShareStatus(null), 2000)
    } catch {
      setSaving(false)
      setShareStatus('儲存失敗（需要登入）')
      setTimeout(() => setShareStatus(null), 3000)
    }
  }

  // ── Share (5.2.11) ──
  async function handleShare() {
    try {
      const share = await apiClient.createShare('Shared from Editor', yaml)
      const url = `${window.location.origin}/share/${share.hash}`
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      setShareStatus('連結已複製！')
      setTimeout(() => setShareStatus(null), 3000)
    } catch {
      setShareStatus('分享失敗')
      setTimeout(() => setShareStatus(null), 3000)
    }
  }

  return (
    <div className="max-w-full mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b flex-wrap">
        {/* Toggle Convention browser */}
        <button
          onClick={() => setShowBrowser(!showBrowser)}
          className="border px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition"
          title="切換 Convention 瀏覽面板"
        >
          {showBrowser ? '隱藏' : '顯示'} Registry
        </button>

        <div className="w-px h-6 bg-gray-300" />

        {/* Preview */}
        <button
          onClick={handlePreview}
          className="bg-bbdsl-secondary text-white px-4 py-1.5 rounded text-sm hover:bg-purple-700 transition"
        >
          預覽叫牌樹
        </button>

        {/* Export */}
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

        <div className="w-px h-6 bg-gray-300" />

        {/* Save draft */}
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="border px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存草稿'}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="border border-bbdsl-primary text-bbdsl-primary px-3 py-1.5 rounded text-sm hover:bg-blue-50 transition"
        >
          分享
        </button>

        {/* Status message */}
        {shareStatus && (
          <span className="text-sm text-bbdsl-success animate-pulse">
            {shareStatus}
          </span>
        )}
        {shareUrl && !shareStatus && (
          <span className="text-xs text-gray-400 truncate max-w-[200px]">
            {shareUrl}
          </span>
        )}
      </div>

      {/* Main layout: [Browser] | Editor | [Validation + Preview] */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Convention Browser (5.2.9) */}
        {showBrowser && (
          <div className="w-64 border-r bg-white overflow-hidden flex flex-col shrink-0">
            <ConventionBrowser onInsert={handleConventionInsert} />
          </div>
        )}

        {/* Center: YAML Editor (5.2.5, 5.2.6) */}
        <div className="flex-1 min-w-0">
          <YamlEditor value={yaml} onChange={handleYamlChange} />
        </div>

        {/* Right: Validation + Preview (5.2.7, 5.2.8) */}
        <div className="w-96 flex flex-col overflow-auto border-l bg-white shrink-0">
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
