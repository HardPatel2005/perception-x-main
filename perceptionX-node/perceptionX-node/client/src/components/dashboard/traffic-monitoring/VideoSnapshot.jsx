import { useState, useEffect, useRef } from 'react'

const VideoSnapshot = ({ videoUrl, timestamp, label, peakCount }) => {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!videoUrl || timestamp === null || timestamp === undefined) {
      setLoading(false)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      setLoading(false)
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const captureSnapshot = () => {
      try {
        // Ensure timestamp is in seconds
        let timestampInSeconds = timestamp
        if (timestampInSeconds > 1000000) {
          timestampInSeconds = timestampInSeconds / 1000
        }

        // Clamp timestamp to video duration
        if (video.duration && timestampInSeconds > video.duration) {
          timestampInSeconds = video.duration
        }

        // Set video time
        video.currentTime = timestampInSeconds

        // Wait for video to seek to the timestamp
        const handleSeeked = () => {
          try {
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth || 640
            canvas.height = video.videoHeight || 360

            // Draw video frame to canvas
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            // Convert canvas to image
            const imageData = canvas.toDataURL('image/jpeg', 0.9)
            setSnapshot(imageData)
            setLoading(false)
            setError(null)
          } catch (err) {
            console.error('Error capturing snapshot:', err)
            setError('Failed to capture snapshot')
            setLoading(false)
          }
        }

        // Set timeout for seeked event (5 seconds max)
        timeoutRef.current = setTimeout(() => {
          console.warn('Snapshot capture timeout')
          setError('Timeout capturing snapshot')
          setLoading(false)
        }, 5000)

        video.addEventListener('seeked', handleSeeked, { once: true })

        // Cleanup function
        return () => {
          video.removeEventListener('seeked', handleSeeked)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
        }
      } catch (err) {
        console.error('Error setting up snapshot capture:', err)
        setError('Failed to setup snapshot capture')
        setLoading(false)
      }
    }

    // Wait for video metadata to load
    if (video.readyState >= 2) {
      // Video already loaded
      captureSnapshot()
    } else {
      video.addEventListener('loadedmetadata', captureSnapshot, { once: true })
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [videoUrl, timestamp])

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A'
    const seconds = parseFloat(ts)
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  if (!videoUrl || timestamp === null || timestamp === undefined) {
    return null
  }

  return (
    <div className="w-full h-full flex flex-col rounded-lg overflow-hidden shadow-sm" style={{ background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.12)' }}>
      {/* Snapshot Section - Fixed Height */}
      <div className="h-[180px] bg-black flex items-center justify-center">
        {loading && !snapshot && (
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-2"></div>
            <p className="text-xs" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Capturing snapshot...</p>
          </div>
        )}
        
        {error && !snapshot && (
          <p className="text-xs" style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error}</p>
        )}
        
        {snapshot && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={snapshot}
              alt={`${label} snapshot`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
      
      {/* Label Card - Integrated at Bottom - Fixed Height */}
      <div className="px-3 py-2.5 h-[48px] flex items-center bg-gray-50" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2a2a2a' }}></div>
            <span className="text-sm font-medium" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{label}</span>
          </div>
          <div className="flex items-center gap-3">
            {peakCount !== undefined && (
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{peakCount} detected</span>
            )}
            <span className="text-xs" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{formatTimestamp(timestamp)}</span>
          </div>
        </div>
      </div>
      
      {/* Hidden video and canvas elements */}
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        style={{ display: 'none' }}
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default VideoSnapshot
