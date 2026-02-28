import { Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Registry from './pages/Registry'
import ConventionDetail from './pages/ConventionDetail'
import Editor from './pages/Editor'
import Diff from './pages/Diff'
import Profile from './pages/Profile'
import SharedView from './pages/SharedView'
import AuthCallback from './pages/AuthCallback'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        {/* Navigation */}
        <NavBar />

        {/* Main Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Registry />} />
            <Route path="/conventions/:id" element={<ConventionDetail />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/diff" element={<Diff />} />
            <Route path="/share/:hash" element={<SharedView />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/auth/callback/:provider"
              element={<AuthCallback />}
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
          BBDSL Platform &copy; {new Date().getFullYear()} — MIT License
        </footer>
      </div>
    </AuthProvider>
  )
}

// ━━━━━━━━━━━━━━ Navigation Bar ━━━━━━━━━━━━━━

function NavBar() {
  const { user, isAuthenticated, logout } = useAuth()

  function handleGitHubLogin() {
    // Redirect to GitHub OAuth authorize URL
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || ''
    const redirectUri = `${window.location.origin}/auth/callback/github`
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email`
    window.location.href = url
  }

  function handleGoogleLogin() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    const redirectUri = `${window.location.origin}/auth/callback/google`
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline`
    window.location.href = url
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-bbdsl-primary">
              BBDSL Platform
            </Link>
            <Link
              to="/"
              className="text-gray-600 hover:text-bbdsl-primary transition"
            >
              Registry
            </Link>
            <Link
              to="/editor"
              className="text-gray-600 hover:text-bbdsl-primary transition"
            >
              Editor
            </Link>
            <Link
              to="/diff"
              className="text-gray-600 hover:text-bbdsl-primary transition"
            >
              Diff
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-gray-600 hover:text-bbdsl-primary transition"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-bbdsl-primary text-white flex items-center justify-center text-xs font-bold">
                      {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium">{user?.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-red-500 text-sm transition"
                >
                  登出
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGitHubLogin}
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default App
