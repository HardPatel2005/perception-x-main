import { useState, useEffect, useRef } from 'react'
import api from '../utils/axiosConfig'

const FileDisplay = ({ fileId }) => {
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [processedUrl, setProcessedUrl] = useState(null)
  const [originalUrlFailed, setOriginalUrlFailed] = useState(false)
  const [processedUrlFailed, setProcessedUrlFailed] = useState(false)
  const uploadedVideoRef = useRef(null)
  const processedVideoRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const syncInitializedRef = useRef(false)
  const cleanupRefsRef = useRef({ intervals: [], listeners: [] })
  const syncTimeoutRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const MAX_RETRIES = 2
    const RETRY_DELAY = 2000

    const fetchMetadata = async (retryAttempt = 0) => {
      try {
        const response = await api.get(`/file/${fileId}/metadata`, {
          timeout: 15000 // 15 second timeout
        })
        
        if (isMounted) {
          setMetadata(response.data)
          
          // Set initial URLs from metadata (already optimized by backend)
          // Use Cloudinary URLs directly if available
          setOriginalUrl(response.data.originalUrl || null)
          setProcessedUrl(response.data.processedUrl || null)
          setLoading(false)
          setError(null)
          
          // Reset failure flags - let the video elements handle errors naturally
          setOriginalUrlFailed(false)
          setProcessedUrlFailed(false)
          
          // If not processed yet, start polling
          if (!response.data.isProcessed) {
            startPolling()
          }
        }
      } catch (err) {
        console.error(`FileDisplay metadata fetch attempt ${retryAttempt + 1} failed:`, err)
        
        // Retry on network errors or timeouts
        const shouldRetry = retryAttempt < MAX_RETRIES && 
                           (err.code === 'ECONNABORTED' || 
                            err.code === 'ETIMEDOUT' || 
                            !err.response || 
                            (err.response.status >= 500 && err.response.status < 600))
        
        if (shouldRetry && isMounted) {
          retryCount++
          console.log(`Retrying FileDisplay metadata fetch (attempt ${retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => {
            if (isMounted) {
              fetchMetadata(retryAttempt + 1)
            }
          }, RETRY_DELAY * (retryAttempt + 1))
        } else if (isMounted) {
          setError('Failed to load file metadata')
          setLoading(false)
        }
      }
    }

    if (fileId) {
      fetchMetadata(0)
    }

    return () => {
      isMounted = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      // Cleanup sync intervals
      cleanupRefsRef.current.intervals.forEach(interval => clearInterval(interval))
      cleanupRefsRef.current.intervals = []
      syncInitializedRef.current = false
    }
  }, [fileId])

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    let pollAttempts = 0
    const MAX_POLL_ATTEMPTS = 150 // 5 minutes max (150 * 2 seconds)
    let currentInterval = 2000 // Start with 2 seconds

    const poll = async () => {
      pollAttempts++
      
      // Exponential backoff: increase interval after every 10 attempts (max 10 seconds)
      if (pollAttempts % 10 === 0 && currentInterval < 10000) {
        currentInterval = Math.min(Math.floor(currentInterval * 1.2), 10000)
        // Restart polling with new interval
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = setInterval(poll, currentInterval)
        return
      }
      
      // Stop polling after max attempts
      if (pollAttempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollIntervalRef.current)
        console.warn('Polling timeout: File processing is taking longer than expected')
        return
      }

      try {
        const response = await api.get(`/file/${fileId}/metadata`, {
          timeout: 10000 // 10 second timeout for polling
        })
        
        if (response.data.isProcessed) {
          clearInterval(pollIntervalRef.current)
          setMetadata(response.data)
          // Update URLs when processing completes
          setOriginalUrl(response.data.originalUrl)
          setProcessedUrl(response.data.processedUrl)
          // Reset failure flags
          setOriginalUrlFailed(false)
          setProcessedUrlFailed(false)
          // Don't call syncVideoPlayback here - let the useEffect handle it
        }
      } catch (err) {
        // Only log errors, don't stop polling on network errors
        if (err.response && err.response.status !== 404) {
          console.error('Error polling for processed file:', err)
        }
        // Continue polling on network errors
      }
    }

    pollIntervalRef.current = setInterval(poll, currentInterval)
  }

  // Video synchronization (same as original EJS)
  const syncVideoPlayback = () => {
    try {
      const uploadedVideo = uploadedVideoRef.current
      const processedVideo = processedVideoRef.current

      if (!uploadedVideo || !processedVideo) {
        console.warn('Video refs not ready for sync')
        return
      }
      
      // Check if videos are actually HTMLVideoElement instances
      if (!(uploadedVideo instanceof HTMLVideoElement) || !(processedVideo instanceof HTMLVideoElement)) {
        console.warn('Video refs are not valid HTMLVideoElement instances')
        return
      }
      
      // Check if videos are still in the DOM
      if (!uploadedVideo.parentNode || !processedVideo.parentNode) {
        console.warn('Video elements not in DOM')
        return
      }
      
      // Additional validation - check if elements are connected
      if (!uploadedVideo.isConnected || !processedVideo.isConnected) {
        console.warn('Video elements not connected to DOM')
        return
      }
      
      if (syncInitializedRef.current) return

      syncInitializedRef.current = true

    // Cleanup previous intervals
    cleanupRefsRef.current.intervals.forEach(interval => clearInterval(interval))
    cleanupRefsRef.current.intervals = []
    
    // Lock playback rate to 1.0
    const lockPlaybackRate = (video) => {
      if (!video || !(video instanceof HTMLVideoElement)) return
      video.playbackRate = 1.0
      const rateCheck = setInterval(() => {
        // Check if video is still valid and in DOM
        if (video && video instanceof HTMLVideoElement && video.parentNode && video.playbackRate !== 1.0) {
          video.playbackRate = 1.0
        }
      }, 100)
      cleanupRefsRef.current.intervals.push(rateCheck)
    }

    lockPlaybackRate(uploadedVideo)
    lockPlaybackRate(processedVideo)

    uploadedVideo.setAttribute('playsinline', '')
    processedVideo.setAttribute('playsinline', '')
    uploadedVideo.playbackRate = 1.0
    processedVideo.playbackRate = 1.0

    let initialized = false
    let replaying = false

    const startBothVideos = () => {
      if (replaying) return
      
      const uploadVideo = uploadedVideoRef.current
      const procVideo = processedVideoRef.current
      
      if (!uploadVideo || !procVideo || !(uploadVideo instanceof HTMLVideoElement) || !(procVideo instanceof HTMLVideoElement)) {
        return
      }

      uploadVideo.playbackRate = 1.0
      procVideo.playbackRate = 1.0
      uploadVideo.currentTime = 0
      procVideo.currentTime = 0

      Promise.all([
        uploadVideo.play().catch(() => {}),
        procVideo.play().catch(() => {})
      ]).then(() => {
        const uploadVid = uploadedVideoRef.current
        const procVid = processedVideoRef.current
        if (uploadVid && procVid && uploadVid instanceof HTMLVideoElement && procVid instanceof HTMLVideoElement) {
          procVid.currentTime = uploadVid.currentTime
          uploadVid.playbackRate = 1.0
          procVid.playbackRate = 1.0
        }
      })
    }

    const handleReplay = () => {
      if (replaying) return
      
      const uploadVideo = uploadedVideoRef.current
      const procVideo = processedVideoRef.current
      
      if (!uploadVideo || !procVideo || !(uploadVideo instanceof HTMLVideoElement) || !(procVideo instanceof HTMLVideoElement)) {
        return
      }
      
      replaying = true

      uploadVideo.pause()
      procVideo.pause()
      uploadVideo.currentTime = 0
      procVideo.currentTime = 0
      uploadVideo.playbackRate = 1.0
      procVideo.playbackRate = 1.0

      setTimeout(() => {
        const uploadVid = uploadedVideoRef.current
        const procVid = processedVideoRef.current
        
        if (!uploadVid || !procVid || !(uploadVid instanceof HTMLVideoElement) || !(procVid instanceof HTMLVideoElement)) {
          replaying = false
          return
        }
        
        Promise.all([
          uploadVid.play().catch(() => {}),
          procVid.play().catch(() => {})
        ]).then(() => {
          const uVid = uploadedVideoRef.current
          const pVid = processedVideoRef.current
          if (uVid && pVid && uVid instanceof HTMLVideoElement && pVid instanceof HTMLVideoElement) {
            uVid.playbackRate = 1.0
            pVid.playbackRate = 1.0
          }
          replaying = false
        }).catch(() => {
          replaying = false
        })
      }, 100)
    }

    const initialize = () => {
      if (initialized) return
      
      const uploadVideo = uploadedVideoRef.current
      const procVideo = processedVideoRef.current
      
      if (!uploadVideo || !procVideo || !(uploadVideo instanceof HTMLVideoElement) || !(procVideo instanceof HTMLVideoElement)) {
        return
      }

      if (uploadVideo.readyState >= 3 && procVideo.readyState >= 3) {
        initialized = true
        uploadVideo.playbackRate = 1.0
        procVideo.playbackRate = 1.0

        setTimeout(() => {
          startBothVideos()
        }, 300)
      }
    }

    // Only add event listeners if videos are still valid
    if (uploadedVideo.isConnected && processedVideo.isConnected) {
      uploadedVideo.addEventListener('canplaythrough', initialize, { once: true })
      processedVideo.addEventListener('canplaythrough', initialize, { once: true })
      uploadedVideo.addEventListener('loadeddata', initialize, { once: true })
      processedVideo.addEventListener('loadeddata', initialize, { once: true })

      initialize()

      uploadedVideo.addEventListener('ended', handleReplay)
      processedVideo.addEventListener('ended', handleReplay)

      uploadedVideo.addEventListener('play', () => {
        const procVideo = processedVideoRef.current
        if (procVideo && procVideo instanceof HTMLVideoElement && procVideo.isConnected && procVideo.paused) {
          procVideo.play().catch(() => {})
        }
      })

      processedVideo.addEventListener('play', () => {
        const uploadVideo = uploadedVideoRef.current
        if (uploadVideo && uploadVideo instanceof HTMLVideoElement && uploadVideo.isConnected && uploadVideo.paused) {
          uploadVideo.play().catch(() => {})
        }
      })

      uploadedVideo.addEventListener('pause', () => {
        const procVideo = processedVideoRef.current
        if (procVideo && procVideo instanceof HTMLVideoElement && procVideo.isConnected && !procVideo.paused) {
          procVideo.pause()
        }
      })

      processedVideo.addEventListener('pause', () => {
        const uploadVideo = uploadedVideoRef.current
        if (uploadVideo && uploadVideo instanceof HTMLVideoElement && uploadVideo.isConnected && !uploadVideo.paused) {
          uploadVideo.pause()
        }
      })
    }

    // Add ratechange listeners with fresh refs
    const uploadVid = uploadedVideoRef.current
    const procVid = processedVideoRef.current
    
    if (uploadVid && uploadVid instanceof HTMLVideoElement && uploadVid.isConnected) {
      uploadVid.addEventListener('ratechange', (e) => {
        if (e.target && e.target instanceof HTMLVideoElement && e.target.playbackRate !== 1.0) {
          e.target.playbackRate = 1.0
        }
      })
    }
    
    if (procVid && procVid instanceof HTMLVideoElement && procVid.isConnected) {
      procVid.addEventListener('ratechange', (e) => {
        if (e.target && e.target instanceof HTMLVideoElement && e.target.playbackRate !== 1.0) {
          e.target.playbackRate = 1.0
        }
      })
    }
    } catch (error) {
      console.error('Error in syncVideoPlayback:', error)
      syncInitializedRef.current = false
    }
  }

  // Reset sync when URLs change (e.g., fallback from Cloudinary)
  useEffect(() => {
    syncInitializedRef.current = false
  }, [originalUrl, processedUrl])

  // Sync videos when both are loaded and processed
  // Note: Actual syncing is triggered by onLoadedMetadata handlers on video elements
  // This effect just ensures cleanup when metadata changes
  useEffect(() => {
    if (!metadata?.isProcessed) {
      syncInitializedRef.current = false
      return
    }
    
    return () => {
      // Cleanup: reset sync flag when component unmounts or metadata changes
      syncInitializedRef.current = false
      // Cleanup intervals
      cleanupRefsRef.current.intervals.forEach(interval => clearInterval(interval))
      cleanupRefsRef.current.intervals = []
    }
  }, [metadata?.isProcessed, fileId])

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center" style={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-4"></div>
        <p style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Loading file...</p>
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className="rounded-xl bg-white border p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <p style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error || 'File not found'}</p>
      </div>
    )
  }

  const isVideo = metadata.mimetype?.startsWith('video')
  const isImage = metadata.mimetype?.startsWith('image')

  // Fallback handler for when URLs fail
  const handleVideoError = (videoType, currentUrl, errorEvent) => {
    // Prevent infinite retry loops
    if (videoType === 'original' && originalUrlFailed) {
      return
    }
    if (videoType === 'processed' && processedUrlFailed) {
      return
    }
    
    const error = errorEvent?.target?.error
    
    // Check if it's a format error (e.g., AVI not supported)
    const isFormatError = error && (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                                    metadata?.mimetype === 'video/avi' ||
                                    metadata?.mimetype === 'video/x-msvideo' ||
                                    metadata?.filename?.toLowerCase().endsWith('.avi'))
    
    // Only mark as format error for original video if it's actually an unsupported format
    if (isFormatError && videoType === 'original') {
      console.warn(`⚠️ Original file format (${metadata?.mimetype}) not supported by browser. Skipping original video.`)
      setOriginalUrlFailed(true)
      return
    }
    
    // For Cloudinary URLs, only try fallback if it's a real network/loading error
    // Don't switch for format errors or if we already have a working Cloudinary URL
    if (currentUrl && currentUrl.includes('cloudinary.com')) {
      // Check if metadata has the same Cloudinary URL - if so, it should work
      const metadataUrl = videoType === 'original' ? metadata?.originalUrl : metadata?.processedUrl
      
      // If metadata has a Cloudinary URL and current URL is different, use metadata URL
      if (metadataUrl && metadataUrl.includes('cloudinary.com') && metadataUrl !== currentUrl) {
        console.warn(`⚠️ Current Cloudinary URL failed, switching to metadata Cloudinary URL: ${metadataUrl.substring(0, 50)}...`)
        if (videoType === 'original') {
          setOriginalUrl(metadataUrl)
        } else {
          setProcessedUrl(metadataUrl)
        }
        return
      }
      
      // Only try backend proxy if it's a network error, not a format error
      if (error && error.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        const fallbackUrl = videoType === 'original' 
          ? `/file/${fileId}/original`
          : `/file/${fileId}/processed`
        
        console.warn(`⚠️ Cloudinary URL failed with network error, trying backend proxy: ${fallbackUrl}`)
        
        if (videoType === 'original') {
          setOriginalUrl(fallbackUrl)
        } else {
          setProcessedUrl(fallbackUrl)
        }
        return
      }
    }
    
    // If backend proxy also failed, mark as failed
    if (currentUrl && currentUrl.startsWith('/file/')) {
      console.error(`❌ Backend proxy also failed for ${videoType} video`)
      if (videoType === 'original') {
        setOriginalUrlFailed(true)
      } else {
        setProcessedUrlFailed(true)
      }
      return
    }
    
    // No fallback available, mark as failed
    console.error(`❌ Failed to load ${videoType} video from: ${currentUrl}`)
    if (videoType === 'original') {
      setOriginalUrlFailed(true)
    } else {
      setProcessedUrlFailed(true)
    }
  }

  // Only show files when processing is complete
  if (!metadata.isProcessed) {
    return (
      <div className="rounded-xl bg-white p-8 text-center" style={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-4"></div>
          <p className="font-medium mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Processing your file...</p>
          <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Files will appear here once processing is complete</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <svg className="w-5 h-5" style={{ color: '#2a2a2a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Uploaded File
        </h4>
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          {isVideo && originalUrl && !originalUrlFailed ? (
            <video 
              key={originalUrl}
              ref={uploadedVideoRef}
              controls 
              autoPlay={false}
              muted 
              playsInline 
              crossOrigin="anonymous"
              className="w-full h-auto uploaded-video" 
              preload="metadata"
              onError={(e) => {
                const error = e.target?.error
                // Only handle error if it's a real error (not just loading/aborted)
                if (error && error.code !== 0 && error.code !== MediaError.MEDIA_ERR_ABORTED) {
                  console.error('❌ Error loading uploaded video:', e, originalUrl)
                  console.error('Video error details:', error)
                  handleVideoError('original', originalUrl, e)
                } else if (error && error.code === MediaError.MEDIA_ERR_ABORTED) {
                  // Aborted is normal during loading, ignore it
                  console.log('ℹ️ Video load aborted (normal during loading):', originalUrl)
                }
              }}
              onLoadedMetadata={() => {
                console.log('✅ Uploaded video metadata loaded:', originalUrl)
                // Video metadata loaded, safe to sync
                if (metadata?.isProcessed && processedUrl && !processedUrlFailed) {
                  // Clear any pending sync
                  if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current)
                  }
                  // Debounce sync to wait for both videos
                  syncTimeoutRef.current = setTimeout(() => {
                    const uploadVid = uploadedVideoRef.current
                    const procVid = processedVideoRef.current
                    if (uploadVid && procVid && 
                        uploadVid instanceof HTMLVideoElement && 
                        procVid instanceof HTMLVideoElement &&
                        uploadVid.readyState >= 1 && 
                        procVid.readyState >= 1 &&
                        uploadVid.isConnected &&
                        procVid.isConnected) {
                      syncInitializedRef.current = false
                      syncVideoPlayback()
                    }
                  }, 300)
                }
              }}
            >
              <source src={originalUrl} type={originalUrl.includes('f_mp4') || originalUrl.endsWith('.mp4') ? 'video/mp4' : (metadata.mimetype || 'video/mp4')} />
            </video>
          ) : isVideo && !originalUrl ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#666666' }}>
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="font-medium mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Original file not available
              </p>
            </div>
          ) : null}
          {isVideo && originalUrlFailed && (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#666666' }}>
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="font-medium mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Original video format not supported
              </p>
              <p className="text-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {metadata?.mimetype || 'This format'} is not supported by your browser
              </p>
            </div>
          )}
          {isImage && originalUrl && (
            <img src={originalUrl} alt="Uploaded" className="w-full h-auto" />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
        <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <svg className="w-5 h-5" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Processed File
        </h4>
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          {processedUrl ? (
            <>
              {isVideo && processedUrl && !processedUrlFailed && (
                <video 
                  key={processedUrl}
                  ref={processedVideoRef}
                  controls 
                  autoPlay={false}
                  muted 
                  playsInline 
                  crossOrigin="anonymous"
                  className="w-full h-auto processed-video" 
                  preload="metadata"
                  onError={(e) => {
                    const error = e.target?.error
                    // Only handle error if it's a real error (not just loading/aborted)
                    if (error && error.code !== 0 && error.code !== MediaError.MEDIA_ERR_ABORTED) {
                      console.error('❌ Error loading processed video:', e, processedUrl)
                      console.error('Video error details:', error)
                      handleVideoError('processed', processedUrl, e)
                    } else if (error && error.code === MediaError.MEDIA_ERR_ABORTED) {
                      // Aborted is normal during loading, ignore it
                      console.log('ℹ️ Video load aborted (normal during loading):', processedUrl)
                    }
                  }}
                  onLoadedMetadata={() => {
                    console.log('✅ Processed video metadata loaded:', processedUrl)
                    // Video metadata loaded, safe to sync
                    if (metadata?.isProcessed && originalUrl && !originalUrlFailed) {
                      // Clear any pending sync
                      if (syncTimeoutRef.current) {
                        clearTimeout(syncTimeoutRef.current)
                      }
                      // Debounce sync to wait for both videos
                      syncTimeoutRef.current = setTimeout(() => {
                        const uploadVid = uploadedVideoRef.current
                        const procVid = processedVideoRef.current
                        if (uploadVid && procVid && 
                            uploadVid instanceof HTMLVideoElement && 
                            procVid instanceof HTMLVideoElement &&
                            uploadVid.readyState >= 1 && 
                            procVid.readyState >= 1 &&
                            uploadVid.isConnected &&
                            procVid.isConnected) {
                          syncInitializedRef.current = false
                          syncVideoPlayback()
                        }
                      }, 300)
                    }
                  }}
                >
                  <source src={processedUrl} type="video/mp4" />
                </video>
              )}
              {isVideo && processedUrlFailed && (
                <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#666666' }}>
                  <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="font-medium mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Processed video failed to load
                  </p>
                </div>
              )}
              {isImage && (
                <img src={processedUrl} alt="Processed" className="w-full h-auto" />
              )}
            </>
          ) : isVideo && !processedUrl ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-4"></div>
              <p className="font-medium mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Processing...</p>
              <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Please wait while we process your file</p>
            </div>
          ) : isVideo && processedUrlFailed ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#666666' }}>
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="font-medium mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Processed video failed to load
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default FileDisplay
