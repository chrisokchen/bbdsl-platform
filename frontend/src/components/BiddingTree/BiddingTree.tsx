interface BiddingTreeProps {
  svgHtml: string
}

export default function BiddingTree({ svgHtml }: BiddingTreeProps) {
  if (!svgHtml) {
    return (
      <p className="text-sm text-gray-400">
        點擊「預覽叫牌樹」按鈕以產生 SVG 圖表。
      </p>
    )
  }

  return (
    <div
      className="overflow-auto border rounded bg-white p-2"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}
