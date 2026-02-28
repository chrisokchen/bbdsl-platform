import { Routes, Route, Link } from 'react-router-dom'
import Registry from './pages/Registry'
import Editor from './pages/Editor'
import Diff from './pages/Diff'
import Profile from './pages/Profile'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
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
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="text-gray-600 hover:text-bbdsl-primary transition"
              >
                Profile
              </Link>
              <button className="bg-bbdsl-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                Login with GitHub
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Registry />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/diff" element={<Diff />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        BBDSL Platform &copy; {new Date().getFullYear()} — MIT License
      </footer>
    </div>
  )
}

export default App
