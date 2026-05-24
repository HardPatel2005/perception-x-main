import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/axiosConfig'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FileDisplay from '../components/FileDisplay'
import Sidebar from '../components/dashboard/shared/Sidebar'

const Result = () => {
  const { fileId } = useParams()
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 seconds

    const fetchMetadata = async (retryAttempt = 0) => {
      try {
        const response = await api.get(`/file/${fileId}/metadata`, {
          timeout: 15000 // 15 second timeout for metadata
        })
        
        if (isMounted) {
          setMetadata(response.data)
          setLoading(false)
          setError(null)
        }
      } catch (err) {
        console.error(`Metadata fetch attempt ${retryAttempt + 1} failed:`, err)
        
        // Retry on network errors or timeouts, but not on 404/403
        const shouldRetry = retryAttempt < MAX_RETRIES && 
                           (err.code === 'ECONNABORTED' || 
                            err.code === 'ETIMEDOUT' || 
                            !err.response || 
                            (err.response.status >= 500 && err.response.status < 600))
        
        if (shouldRetry && isMounted) {
          retryCount++
          console.log(`Retrying metadata fetch (attempt ${retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => {
            if (isMounted) {
              fetchMetadata(retryAttempt + 1)
            }
          }, RETRY_DELAY * (retryAttempt + 1)) // Exponential backoff
        } else if (isMounted) {
          setError(err.response?.data?.error || 'Failed to load file. Please try again.')
          setLoading(false)
        }
      }
    }

    if (fileId) {
      fetchMetadata(0)
    }

    return () => {
      isMounted = false
    }
  }, [fileId])

  const formatFileType = (mimetype) => {
    if (!mimetype) return 'Unknown'
    const [type, subtype] = mimetype.split('/')
    const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'File'
    const subtypeLabel = subtype ? subtype.toUpperCase() : ''
    return subtypeLabel ? `${typeLabel} • ${subtypeLabel}` : typeLabel
  }

  const formatStatus = (isProcessed) => {
    if (isProcessed) return 'Completed'
    return 'Processing'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#ffffff' }}>
        <Navbar isMenuOpen={false} setIsMenuOpen={() => {}} />
        <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '64px' }}>
        <Sidebar isOpen={true} onToggle={() => {}} />
        <div className="flex flex-1 flex-col overflow-y-auto lg:ml-[260px]">
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-4"></div>
              <p style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Loading results...</p>
            </div>
          </main>
        </div>
        </div>
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#ffffff' }}>
        <Navbar isMenuOpen={false} setIsMenuOpen={() => {}} />
        <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '64px' }}>
        <Sidebar isOpen={true} onToggle={() => {}} />
        <div className="flex flex-1 flex-col overflow-y-auto lg:ml-[260px]">
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white border rounded-xl p-8 max-w-md w-full text-center" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <h3 className="font-semibold text-xl mb-2" style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Error</h3>
              <p className="mb-4" style={{ color: '#991b1b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error || 'File not found'}</p>
              <Link
                to="/analytics"
                className="inline-block px-6 py-2 text-white rounded-lg transition-all"
                style={{
                  background: '#2a2a2a',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1a1a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2a2a2a'
                }}
              >
                Back to Analytics
              </Link>
            </div>
          </main>
        </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#fafafa' }}>
      <Navbar isMenuOpen={false} setIsMenuOpen={() => {}} />
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '64px' }}>
      <Sidebar isOpen={true} onToggle={() => {}} />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-[260px] min-w-0">
        <main className="flex-1 flex flex-col overflow-hidden p-6 min-h-0">
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 h-full min-h-0">
            {/* Header Section */}
            <div className="flex-shrink-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <div className="space-y-2">
                  <h1 
                    className="text-3xl font-semibold mb-2"
                    style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                  >
                    Processing Overview
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      Source File
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      {metadata.filename}
                    </span>
                  </div>
                </div>
                {metadata.isProcessed && (
                  <Link
                    to={`/analytics/${fileId}`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-all flex-shrink-0"
                    style={{
                      background: '#2a2a2a',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1a1a1a'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#2a2a2a'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Detailed Analytics
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                  <p className="text-xs font-semibold uppercase mb-2 tracking-wider" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    File Type
                  </p>
                  <p className="text-xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {formatFileType(metadata.mimetype)}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                  <p className="text-xs font-semibold uppercase mb-2 tracking-wider" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Processing Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${metadata.isProcessed ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{
                        boxShadow: metadata.isProcessed ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 0 8px rgba(234, 179, 8, 0.5)'
                      }}
                    />
                    <p className="text-xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      {formatStatus(metadata.isProcessed)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                  <p className="text-xs font-semibold uppercase mb-2 tracking-wider" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    File Size
                  </p>
                  <p className="text-xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {metadata.size ? `${(metadata.size / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Result viewer - scrollable content */}
            <div className="flex-1 min-h-0 rounded-xl bg-white shadow-sm overflow-auto" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <div className="p-6">
                <FileDisplay fileId={fileId} />
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
      <Footer />
    </div>
  )
}

export default Result
