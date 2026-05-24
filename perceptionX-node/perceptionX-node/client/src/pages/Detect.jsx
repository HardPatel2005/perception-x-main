import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSocket } from '../hooks/useSocket'
import { useFileUpload } from '../hooks/useFileUpload'
import { useAuth } from '../context/AuthContext'
import ProgressBar from '../components/ProgressBar'
import FileDisplay from '../components/FileDisplay'

const Detect = () => {
  const [file, setFile] = useState(null)
  const [selectedServiceType, setSelectedServiceType] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const fileInputRef = useRef(null)
  const uploadInProgressRef = useRef(false) // Track upload state with ref to prevent double submission
  const { socket } = useSocket()
  const { uploadFile, progress, statusMessage, isUploading, error, fileId } = useFileUpload(socket)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Available service types/solutions
  const serviceTypes = [
    { value: 'traffic-monitoring', label: 'Traffic Monitoring', description: 'Monitor vehicle and pedestrian traffic flow' },
    { value: 'wildlife-monitoring', label: 'Wildlife & Livestock', description: 'Monitor wildlife, livestock, and animal activity' },
    { value: 'restaurant-monitoring', label: 'Restaurant & Kitchen', description: 'Analyze food, utensils, appliances in kitchen scenes' }
  ]

  // Redirect when progress reaches 100% - faster redirect
  useEffect(() => {
    if (progress >= 100 && fileId) {
      const timer = setTimeout(() => {
        navigate(`/result/${fileId}`)
      }, 500) // Reduced from 1500ms for faster redirect
      return () => clearTimeout(timer)
    }
  }, [progress, fileId, navigate])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files
      }
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    // Check authentication first
    if (!isAuthenticated) {
      alert('Please log in to upload files. You will be redirected to the login page.')
      navigate('/login')
      return
    }
    
    // Prevent double submission - check both state and ref
    if (isSubmitting || isUploading || uploadInProgressRef.current) {
      console.warn('Upload already in progress, ignoring duplicate submission')
      return
    }

    if (!selectedServiceType) {
      alert('Please select a service type before uploading.')
      return
    }

    if (!file) {
      alert('Please select a file.')
      return
    }

    // Set flags immediately to prevent double submission
    uploadInProgressRef.current = true
    setIsSubmitting(true)
    setShowProgress(true)
    
    try {
      const uploadedFileId = await uploadFile(file, selectedServiceType)
      
      if (!uploadedFileId && error) {
        console.error('Upload failed:', error)
        setIsSubmitting(false)
        uploadInProgressRef.current = false
      } else {
        // Keep isSubmitting true until redirect or error
        // uploadInProgressRef will be reset on redirect or error
      }
    } catch (err) {
      console.error('Upload error:', err)
      setIsSubmitting(false)
      uploadInProgressRef.current = false
    }
  }
  
  // Reset upload state when component unmounts or on error
  useEffect(() => {
    if (error) {
      uploadInProgressRef.current = false
      setIsSubmitting(false)
    }
  }, [error])
  
  // Reset upload state when redirecting
  useEffect(() => {
    if (progress >= 100 && fileId) {
      // Reset after redirect
      const timer = setTimeout(() => {
        uploadInProgressRef.current = false
        setIsSubmitting(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [progress, fileId])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 flex-1" style={{ background: '#fafafa', paddingTop: '80px' }}>
      <div className="max-w-2xl w-full space-y-8">
        {!isAuthenticated && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Login Required</h3>
                <p className="text-gray-700 mb-4">Please log in to upload and process files. Your files will be saved to your account.</p>
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Log in here
                </Link>
              </div>
            </div>
          </div>
        )}
        {!showProgress ? (
          <div className="rounded-xl bg-white p-8 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Upload File for Processing</h2>
              <p style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Upload images or videos to detect objects using AI</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Service Type Selection */}
              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium mb-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Select Service Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="serviceType"
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border text-sm"
                  style={{
                    borderColor: selectedServiceType ? 'rgba(0, 0, 0, 0.25)' : 'rgba(220, 38, 38, 0.5)',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = selectedServiceType ? 'rgba(0, 0, 0, 0.25)' : 'rgba(220, 38, 38, 0.5)'
                  }}
                >
                  <option value="">-- Select a service type --</option>
                  {serviceTypes.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
                {selectedServiceType && (
                  <p className="mt-1 text-xs" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    {serviceTypes.find(s => s.value === selectedServiceType)?.description}
                  </p>
                )}
              </div>

              <label htmlFor="fileInput" className="block">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#2a2a2a] bg-[#f5f5f5]'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  style={{
                    borderColor: dragActive ? '#2a2a2a' : 'rgba(0, 0, 0, 0.25)',
                    backgroundColor: dragActive ? '#f5f5f5' : '#f9fafb',
                    borderWidth: '2px'
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    name="file"
                    id="fileInput"
                    ref={fileInputRef}
                    onChange={handleChange}
                    required
                    className="hidden"
                    accept="image/*,video/*"
                  />
                  
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <svg className="w-16 h-16" style={{ color: '#666666' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Drag & Drop or click to upload</p>
                      <p className="text-sm mt-1" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Supports images and videos</p>
                    </div>
                    {file && (
                      <p className="text-sm font-medium" style={{ color: '#2a2a2a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{file.name}</p>
                    )}
                  </div>
                </div>
              </label>

              <button
                type="submit"
                disabled={!isAuthenticated || !selectedServiceType || !file || isUploading || isSubmitting || uploadInProgressRef.current}
                className="w-full py-3 px-6 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{
                  background: !isAuthenticated || !selectedServiceType || !file || isUploading || isSubmitting || uploadInProgressRef.current ? '#cccccc' : '#2a2a2a',
                  color: '#ffffff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (!(!isAuthenticated || !selectedServiceType || !file || isUploading || isSubmitting || uploadInProgressRef.current)) {
                    e.currentTarget.style.background = '#1a1a1a'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!isAuthenticated || !selectedServiceType || !file || isUploading || isSubmitting || uploadInProgressRef.current)) {
                    e.currentTarget.style.background = '#2a2a2a'
                  }
                }}
              >
                {!isAuthenticated ? 'Please Log In to Upload' : (isUploading || isSubmitting || uploadInProgressRef.current ? 'Processing...' : 'Upload & Process')}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <ProgressBar progress={progress} statusMessage={statusMessage} />
            {/* Only show FileDisplay when processing is complete (progress >= 100) */}
            {fileId && progress >= 100 && <FileDisplay fileId={fileId} />}
            {error && (
              <div className="rounded-xl bg-white border border-red-300 p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <h4 className="font-semibold mb-2" style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Error</h4>
                <p style={{ color: '#991b1b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error}</p>
                <button
                  onClick={() => {
                    setShowProgress(false)
                    setFile(null)
                    setIsSubmitting(false)
                    uploadInProgressRef.current = false
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="mt-4 px-4 py-2 text-white rounded-lg transition-all"
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
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      <Footer />
    </div>
  )
}

export default Detect
