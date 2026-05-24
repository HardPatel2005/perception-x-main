import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Detect from './pages/Detect'
import LiveDetect from './pages/LiveDetect'
import Result from './pages/Result'
import Analytics from './pages/Analytics'
import Login from './components/Login'
import Signup from './components/Signup'
import { useAuth } from './context/AuthContext'

// Component to handle documentation redirect with scroll
const DocumentationRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Navigate to home and then scroll to developers section
    if (location.pathname === '/documentation') {
      navigate('/', { replace: true })
      setTimeout(() => {
        const developersSection = document.getElementById('developers')
        if (developersSection) {
          developersSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          })
          window.history.replaceState(null, '', '/#developers')
        }
      }, 100)
    }
  }, [location.pathname, navigate])

  return <Home />
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        <Route 
          path="/detect" 
          element={<Detect />}
        />
        <Route 
          path="/live-detect" 
          element={
            <ProtectedRoute>
              <LiveDetect />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/result/:fileId" 
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={<Analytics />}
        />
        <Route 
          path="/analytics/:fileId" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documentation" 
          element={<DocumentationRedirect />} 
        />
        <Route 
          path="/pricing" 
          element={<Navigate to="/" replace />} 
        />
        <Route 
          path="/contact" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </Router>
  )
}

export default App