/**
 * OAuth callback handler — receives the authorization code from GitHub/Google
 * redirect and exchanges it for a platform JWT.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function AuthCallback() {
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithGitHub, loginWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received')
      return
    }

    async function exchange(code: string) {
      try {
        if (provider === 'github') {
          await loginWithGitHub(code)
        } else if (provider === 'google') {
          const redirectUri = `${window.location.origin}/auth/callback/google`
          await loginWithGoogle(code, redirectUri)
        } else {
          setError(`Unknown provider: ${provider}`)
          return
        }
        navigate('/profile', { replace: true })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Authentication failed',
        )
      }
    }

    exchange(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-bbdsl-error mb-2">
          登入失敗
        </h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="text-bbdsl-primary hover:underline"
        >
          返回首頁
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bbdsl-primary mb-4" />
      <p className="text-gray-600">正在登入中...</p>
    </div>
  )
}
