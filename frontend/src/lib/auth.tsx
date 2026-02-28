/**
 * Authentication context — manages user state, JWT token, OAuth flows.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

// ── Types ──

export interface AuthUser {
  id: number
  name: string
  email: string | null
  avatar_url: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  loginWithGitHub: (code: string) => Promise<void>
  loginWithGoogle: (code: string, redirectUri?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const TOKEN_KEY = 'bbdsl_token'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const BASE_URL = '/api/v1'

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    loading: true,
  })

  // Fetch current user from /me on mount (if token exists)
  const fetchMe = useCallback(async (jwt: string) => {
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!res.ok) {
        // Token invalid — clear it
        localStorage.removeItem(TOKEN_KEY)
        setState({ user: null, token: null, loading: false })
        return
      }
      const user: AuthUser = await res.json()
      setState({ user, token: jwt, loading: false })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setState({ user: null, token: null, loading: false })
    }
  }, [])

  useEffect(() => {
    if (state.token) {
      fetchMe(state.token)
    } else {
      setState((prev: AuthState) => ({ ...prev, loading: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loginWithGitHub = useCallback(
    async (code: string) => {
      const res = await fetch(`${BASE_URL}/auth/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }))
        throw new Error(err.detail ?? 'GitHub login failed')
      }
      const data = await res.json()
      const jwt: string = data.access_token
      localStorage.setItem(TOKEN_KEY, jwt)
      await fetchMe(jwt)
    },
    [fetchMe],
  )

  const loginWithGoogle = useCallback(
    async (code: string, redirectUri = 'postmessage') => {
      const res = await fetch(`${BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }))
        throw new Error(err.detail ?? 'Google login failed')
      }
      const data = await res.json()
      const jwt: string = data.access_token
      localStorage.setItem(TOKEN_KEY, jwt)
      await fetchMe(jwt)
    },
    [fetchMe],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setState({ user: null, token: null, loading: false })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginWithGitHub,
      loginWithGoogle,
      logout,
      isAuthenticated: state.user !== null,
    }),
    [state, loginWithGitHub, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ──

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

// ── Helper: get stored token for API calls ──

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
