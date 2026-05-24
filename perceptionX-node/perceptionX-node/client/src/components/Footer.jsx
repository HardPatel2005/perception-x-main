import { useLocation } from 'react-router-dom'

const Footer = () => {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  const isHomePage = location.pathname === '/'
  const isDetectPage = location.pathname === '/detect'
  const isAnalyticsPage = location.pathname.startsWith('/analytics') || location.pathname.startsWith('/result')
  
  // Use light theme for auth pages, home page, detect page, and analytics pages, dark for others
  const isLightTheme = isAuthPage || isHomePage || isDetectPage || isAnalyticsPage
  
  return (
    <footer 
      className="relative z-10 mt-auto flex-shrink-0"
      style={{
        backgroundColor: isLightTheme ? '#ffffff' : '#1a1a2e',
        borderTop: 'none',
        border: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        outline: 'none',
        borderTopWidth: 0,
        borderTopStyle: 'none',
        borderTopColor: 'transparent',
        borderBottomWidth: 0,
        borderBottomStyle: 'none',
        borderBottomColor: 'transparent',
        width: '100%',
        position: 'relative',
        minHeight: '80px'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side: Find Me and icons together */}
          <div className="flex items-center gap-3">
            <div 
              className="text-sm"
              style={{ color: isLightTheme ? '#6b7280' : '#9ca3af' }}
            >
              Find Me
            </div>
            {/* Professional arrow */}
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: isLightTheme ? '#6b7280' : '#9ca3af' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/hard_patel201?igsh=YjZtdnNqZnAyZGNm"
              target="_blank"
              rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: isLightTheme ? '#6b7280' : '#9ca3af'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isLightTheme ? '#111827' : '#ffffff'
                  e.currentTarget.style.backgroundColor = isLightTheme ? '#f3f4f6' : '#23233a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isLightTheme ? '#6b7280' : '#9ca3af'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://x.com/hard_patel201?t=MaBwOzrorudWhOUD4X6K-g&s=08"
              target="_blank"
              rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: isLightTheme ? '#6b7280' : '#9ca3af'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isLightTheme ? '#111827' : '#ffffff'
                  e.currentTarget.style.backgroundColor = isLightTheme ? '#f3f4f6' : '#23233a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isLightTheme ? '#6b7280' : '#9ca3af'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              aria-label="Twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            </div>
          </div>
          
          {/* Right side: Copyright */}
          <div 
            className="text-sm"
            style={{ color: isLightTheme ? '#6b7280' : '#9ca3af' }}
          >
            © {new Date().getFullYear()} PerceptionX. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
