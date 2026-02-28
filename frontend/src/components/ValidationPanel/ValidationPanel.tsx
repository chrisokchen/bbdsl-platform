import type { ValidationReport } from '../../lib/ws'

interface ValidationPanelProps {
  report: ValidationReport | null
}

export default function ValidationPanel({ report }: ValidationPanelProps) {
  if (!report) {
    return (
      <p className="text-sm text-gray-400">
        尚未收到驗證結果。開始編輯 YAML 以觸發驗證。
      </p>
    )
  }

  const { error_count, warning_count, results } = report

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span
          className={`font-semibold ${error_count > 0 ? 'text-bbdsl-error' : 'text-bbdsl-success'}`}
        >
          {error_count} 錯誤
        </span>
        <span
          className={`font-semibold ${warning_count > 0 ? 'text-bbdsl-warning' : 'text-bbdsl-success'}`}
        >
          {warning_count} 警告
        </span>
      </div>

      {/* Results list */}
      {results.length === 0 ? (
        <p className="text-sm text-bbdsl-success">✔ 所有驗證規則通過</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <li
              key={i}
              className={`text-sm p-2 rounded border-l-4 ${
                r.severity === 'error'
                  ? 'border-bbdsl-error bg-red-50'
                  : 'border-bbdsl-warning bg-yellow-50'
              }`}
            >
              <span className="font-mono text-xs text-gray-500">
                [{r.rule_id}]
              </span>{' '}
              {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
