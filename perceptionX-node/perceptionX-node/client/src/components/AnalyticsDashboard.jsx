import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../utils/axiosConfig'
import {
  Camera,
  ChevronRight,
  Activity,
  FileText,
  Building2,
  Shield,
  ShoppingBag,
  Users,
  Car,
  Factory,
  Trash2,
  Clock,
  HardDrive,
  Video,
  PawPrint,
  UtensilsCrossed
} from 'lucide-react'

const AnalyticsDashboard = () => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [files, setFiles] = useState([])
  const [selectedServiceType, setSelectedServiceType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null) // Track which file is being deleted
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const timeoutRef = useRef(null)
  const navigate = useNavigate()

  // Service type definitions with icons
  const serviceTypes = {
    'traffic-monitoring': { 
      label: 'Traffic Monitoring', 
      icon: Car, 
      color: '#3b82f6',
      description: 'Monitor vehicle and pedestrian traffic flow'
    },
    'wildlife-monitoring': { 
      label: 'Wildlife & Livestock', 
      icon: PawPrint, 
      color: '#16a34a',
      description: 'Monitor wildlife, livestock, and animal activity'
    },
    'restaurant-monitoring': { 
      label: 'Restaurant & Kitchen', 
      icon: UtensilsCrossed, 
      color: '#f59e0b',
      description: 'Analyze food, utensils, appliances in kitchen scenes'
    }
  }

  useEffect(() => {
    // Don't load data if not authenticated
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    let isMounted = true

    const loadData = async () => {
      try {
        console.log('📡 Fetching analytics files list...');
        const response = await api.get('/api/analytics/files', {
          timeout: 15000 // 15 second timeout
        })
        console.log('✅ Analytics files received');
        
        if (isMounted) {
          // Clear timeout immediately when data arrives
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          
          const filesData = response.data.files || []
          setFiles(filesData)
          setLoading(false)
          setError(null) // Clear any previous errors
        }
      } catch (err) {
        if (isMounted) {
          // Clear timeout on error too
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          
          console.error('Error fetching analytics files:', err)
          let errorMessage = 'Failed to load files'
          if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
            errorMessage = 'Backend server not running. Please start the Node.js server on port 3000.'
          } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            errorMessage = 'Request timed out. The server may be processing large amounts of data.'
          } else if (err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please ensure the backend server is running.'
          } else if (err.response?.data?.error) {
            errorMessage = err.response.data.error
          } else if (err.message) {
            errorMessage = err.message
          }
          setError(errorMessage)
          setLoading(false)
        }
      }
    }

    loadData()

    // Safety timeout - must be longer than axios timeout
    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        // Use functional update to check current loading state
        setLoading(currentLoading => {
          if (currentLoading) {
            console.warn('⏱️ Safety timeout reached for analytics files');
            setError('Request timed out. Please ensure the backend server is running on port 3000.')
            return false
          }
          return currentLoading
        })
      }
    }, 20000) // 20 second safety timeout (longer than 15s axios timeout)

    return () => {
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    setLoading(true)
    setError(null)
    try {
      console.log('📡 Retrying fetch analytics files...');
      const response = await api.get('/api/analytics/files', {
        timeout: 15000 // 15 second timeout
      })
      console.log('✅ Analytics files received on retry');
      
      const filesData = response.data.files || []
      setFiles(filesData)
      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Error fetching analytics files:', err)
      let errorMessage = 'Failed to load files'
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        errorMessage = 'Backend server not running. Please start the Node.js server on port 3000.'
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be processing large amounts of data.'
      } else if (err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please ensure the backend server is running.'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDeleteFile = async (fileId, filename, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(fileId)
    try {
      const response = await api.delete(`/file/${fileId}`)
      if (response.data.success) {
        // Remove file from state
        setFiles(prevFiles => prevFiles.filter(f => f._id !== fileId))
        // If we're on the detail page for this file, redirect to analytics
        if (window.location.pathname.includes(`/analytics/${fileId}`)) {
          navigate('/analytics')
        }
      }
    } catch (err) {
      console.error('Error deleting file:', err)
      alert('Failed to delete file. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL ${displayFiles.length} files? This action cannot be undone.`)) {
      setShowDeleteAllConfirm(false)
      return
    }

    setDeleting('all')
    try {
      const deletePromises = displayFiles.map(file => 
        api.delete(`/file/${file._id}`).catch(err => {
          console.error(`Error deleting file ${file._id}:`, err)
          return null
        })
      )
      
      await Promise.all(deletePromises)
      setFiles([])
      setShowDeleteAllConfirm(false)
      alert('All files deleted successfully.')
    } catch (err) {
      console.error('Error deleting all files:', err)
      alert('Some files could not be deleted. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  // Group files by service type
  const filesByServiceType = files.reduce((acc, file) => {
    const serviceType = file.serviceType || 'traffic-monitoring'
    if (!acc[serviceType]) {
      acc[serviceType] = []
    }
    acc[serviceType].push(file)
    return acc
  }, {})

  // Get available service types that have files
  const availableServiceTypes = Object.keys(filesByServiceType).filter(
    serviceType => filesByServiceType[serviceType].length > 0
  )

  // Files to display - filtered by selected service type
  const displayFiles = selectedServiceType 
    ? filesByServiceType[selectedServiceType] || []
    : []

  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <div className="flex-1 flex items-center justify-center" style={{ paddingTop: '64px' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-4"></div>
          <p style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Loading...</p>
        </div>
      </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <div className="flex-1 flex items-center justify-center px-4" style={{ paddingTop: '64px' }}>
        <div className="max-w-2xl w-full">
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 shadow-sm text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Login to View Analytics</h2>
              <p className="text-gray-700 mb-6">
                Please log in and upload documents to view analytics. Your uploaded files and their analytics will be displayed here.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-md"
              >
                Login Here
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <div className="flex-1 flex items-center justify-center px-4" style={{ paddingTop: '64px' }}>
        <div className="rounded-xl bg-white border border-red-300 p-8 max-w-md w-full text-center" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <h3 className="font-semibold text-xl mb-2" style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Error</h3>
          <p className="mb-4" style={{ color: '#991b1b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2 text-white rounded-lg transition-all"
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
            Retry
          </button>
        </div>
      </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#fafafa' }}>
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <div className="flex-1" style={{ paddingTop: '64px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Single heading */}
        {selectedServiceType ? (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => setSelectedServiceType(null)}
                className="p-2 rounded-lg transition-all hover:bg-gray-100"
                style={{ color: '#666666' }}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  {serviceTypes[selectedServiceType]?.label || 'Analytics'}
                </h1>
                <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Click on any file to view detailed analytics
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Analytics Systems
            </h1>
            <p style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Select a service type to view processed files
            </p>
          </div>
        )}

        {/* Service Type Selection - Show systems when none selected */}
        {!selectedServiceType && availableServiceTypes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Available Systems
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableServiceTypes.map((serviceType) => {
                const service = serviceTypes[serviceType]
                const serviceFiles = filesByServiceType[serviceType]
                const Icon = service?.icon || Building2
                const fileCount = serviceFiles.length
                const processedCount = serviceFiles.filter(f => f.isProcessed).length

                return (
                  <button
                    key={serviceType}
                    onClick={() => setSelectedServiceType(serviceType)}
                    className="rounded-xl bg-white p-6 shadow-sm text-left transition-all hover:shadow-md"
                    style={{ 
                      border: '1px solid rgba(0, 0, 0, 0.12)', 
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 rounded-lg" style={{ background: `${service?.color || '#666'}15` }}>
                        <Icon className="w-6 h-6" style={{ color: service?.color || '#666' }} />
                      </div>
                      <ChevronRight className="w-5 h-5" style={{ color: '#999' }} />
                    </div>
                    <h4 className="font-semibold mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      {service?.label || serviceType}
                    </h4>
                    <p className="text-sm mb-3" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      {service?.description || 'View files'}
                    </p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                      <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
                      <span>{processedCount} processed</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}


        {/* Stats Summary - Only show when service type is selected */}
        {selectedServiceType && displayFiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm mb-2 font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Processed Files</p>
                  <p className="text-3xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{displayFiles.length}</p>
                  <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Ready for analysis
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                  <FileText className="w-8 h-8" style={{ color: '#3b82f6' }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm mb-2 font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Total Storage</p>
                  <p className="text-3xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {formatFileSize(displayFiles.reduce((sum, file) => sum + (file.size || 0), 0))}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Across all files
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'rgba(22, 163, 74, 0.1)' }}>
                  <HardDrive className="w-8 h-8" style={{ color: '#16a34a' }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm mb-2 font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Total Detections</p>
                  <p className="text-3xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {displayFiles.reduce((sum, file) => sum + (file.totalEvents || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Objects detected
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'rgba(147, 51, 234, 0.1)' }}>
                  <Camera className="w-8 h-8" style={{ color: '#9333ea' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Files List - Only show when service type is selected */}
        {selectedServiceType && (
        <div className="rounded-xl bg-white overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
          <div className="p-6 border-b flex items-center justify-between bg-gray-50" style={{ borderColor: 'rgba(0, 0, 0, 0.12)' }}>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Processed Files</h2>
              <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ color: '#666666', background: 'rgba(0, 0, 0, 0.05)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {displayFiles.length} {displayFiles.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            {displayFiles.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={deleting === 'all'}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: '#dc2626',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  background: 'rgba(220, 38, 38, 0.05)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)'
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
          </div>
          {displayFiles.length === 0 ? (
            <div className="p-12 text-center">
              <Camera className="w-16 h-16 mx-auto mb-4" style={{ color: '#999999' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No processed files yet</h3>
              <p className="mb-6" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Upload and process files to see analytics</p>
              <Link
                to="/detect"
                className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all"
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
                Upload File
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}>
              {displayFiles.map((file) => (
                <div
                  key={file._id}
                  className="group relative transition-all"
                  style={{
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Link
                    to={`/analytics/${file._id}`}
                    className="block p-6"
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="p-3 rounded-xl flex-shrink-0" style={{ background: file.mimetype?.startsWith('video') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)' }}>
                          {file.mimetype?.startsWith('video') ? (
                            <Video className="w-6 h-6" style={{ color: '#3b82f6' }} />
                          ) : (
                            <FileText className="w-6 h-6" style={{ color: '#6b7280' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-2 truncate" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                            {file.filename || 'Unknown File'}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#999999' }} />
                              <span className="truncate">{formatDate(file.uploadDate)}</span>
                            </div>
                            {file.size > 0 && (
                              <div className="flex items-center gap-2" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                <HardDrive className="w-4 h-4 flex-shrink-0" style={{ color: '#999999' }} />
                                <span>{formatFileSize(file.size)}</span>
                              </div>
                            )}
                            {file.duration && file.duration > 0 && (
                              <div className="flex items-center gap-2" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                                <Video className="w-4 h-4 flex-shrink-0" style={{ color: '#999999' }} />
                                <span>{formatDuration(file.duration)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                              <Activity className="w-4 h-4 flex-shrink-0" style={{ color: '#999999' }} />
                              <span>{file.totalEvents || 0} detections</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => handleDeleteFile(file._id, file.filename, e)}
                          disabled={deleting === file._id}
                          className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            color: '#dc2626',
                            background: 'rgba(220, 38, 38, 0.05)',
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)'
                            }
                          }}
                          title="Delete file"
                        >
                          {deleting === file._id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                        <ChevronRight className="w-5 h-5" style={{ color: '#999999' }} />
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteAllConfirm(false)}>
            <div 
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              style={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}
            >
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Delete All Files?
              </h3>
              <p className="mb-6" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Are you sure you want to delete all {displayFiles.length} processed files? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    color: '#666666',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    background: '#ffffff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleting === 'all'}
                  className="px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: '#dc2626',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = '#b91c1c'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = '#dc2626'
                    }
                  }}
                >
                  {deleting === 'all' ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no service type selected and no files */}
        {!selectedServiceType && availableServiceTypes.length === 0 && files.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
            <Camera className="w-16 h-16 mx-auto mb-4" style={{ color: '#999999' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No files yet</h3>
            <p className="mb-6" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Upload and process files to see analytics</p>
            <Link
              to="/detect"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all"
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
              Upload File
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
