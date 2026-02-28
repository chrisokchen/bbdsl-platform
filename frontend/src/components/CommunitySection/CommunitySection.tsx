/**
 * Community section for ConventionDetail page — ratings + comments.
 */
import { useState, useEffect, useCallback } from 'react'
import { apiClient, type RatingStats, type CommentItem } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import StarRating from '../StarRating/StarRating'

interface CommunitySectionProps {
  conventionId: number
}

export default function CommunitySection({
  conventionId,
}: CommunitySectionProps) {
  const { user, isAuthenticated } = useAuth()
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentPage, setCommentPage] = useState(1)
  const [newComment, setNewComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const loadRatings = useCallback(async () => {
    try {
      const stats = await apiClient.getRatingStats(conventionId)
      setRatingStats(stats)
    } catch {
      // ignore
    }
  }, [conventionId])

  const loadComments = useCallback(
    async (page = 1) => {
      setLoadingComments(true)
      try {
        const data = await apiClient.listComments(conventionId, {
          page,
          page_size: 20,
        })
        setComments(data.items)
        setCommentTotal(data.total)
        setCommentPage(page)
      } catch {
        // ignore
      } finally {
        setLoadingComments(false)
      }
    },
    [conventionId],
  )

  useEffect(() => {
    loadRatings()
    loadComments(1)
  }, [loadRatings, loadComments])

  async function handleRate(score: number) {
    if (!isAuthenticated) return
    setSubmittingRating(true)
    try {
      await apiClient.upsertRating(conventionId, score)
      await loadRatings()
    } catch {
      console.error('Rating failed')
    } finally {
      setSubmittingRating(false)
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated || !newComment.trim()) return
    setSubmittingComment(true)
    try {
      await apiClient.createComment(conventionId, newComment.trim())
      setNewComment('')
      await loadComments(1) // reload first page
    } catch {
      console.error('Comment failed')
    } finally {
      setSubmittingComment(false)
    }
  }

  const commentPages = Math.max(1, Math.ceil(commentTotal / 20))

  return (
    <div className="mt-8 space-y-8">
      {/* ── Ratings ── */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">評分</h2>

        <div className="flex items-center gap-6">
          {/* Overall stats */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-800">
              {ratingStats ? ratingStats.average.toFixed(1) : '—'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {ratingStats?.count ?? 0} 則評分
            </div>
            {ratingStats && (
              <div className="mt-2">
                <StarRating
                  value={Math.round(ratingStats.average)}
                  readonly
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* User's rating */}
          <div className="border-l pl-6">
            {isAuthenticated ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">您的評分：</p>
                <StarRating
                  value={ratingStats?.user_rating ?? 0}
                  onChange={handleRate}
                  size="lg"
                />
                {submittingRating && (
                  <p className="text-xs text-gray-400 mt-1">儲存中...</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                登入後即可評分
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Comments ── */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          留言（{commentTotal}）
        </h2>

        {/* New comment form */}
        {isAuthenticated ? (
          <form onSubmit={handlePostComment} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bbdsl-primary text-white flex items-center justify-center text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="寫下您的看法..."
                  rows={3}
                  maxLength={2000}
                  className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bbdsl-primary"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">
                    {newComment.length} / 2000
                  </span>
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="bg-bbdsl-primary text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {submittingComment ? '發送中...' : '發送'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded">
            登入後即可留言
          </p>
        )}

        {/* Comment list */}
        {loadingComments ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bbdsl-primary" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">
            尚無留言。成為第一個留言的人吧！
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 py-3 border-b last:border-b-0"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-semibold">
                  {comment.author_name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment pagination */}
        {commentPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t">
            <button
              onClick={() => loadComments(commentPage - 1)}
              disabled={commentPage <= 1}
              className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 transition"
            >
              上一頁
            </button>
            <span className="text-xs text-gray-500">
              {commentPage} / {commentPages}
            </span>
            <button
              onClick={() => loadComments(commentPage + 1)}
              disabled={commentPage >= commentPages}
              className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 transition"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
