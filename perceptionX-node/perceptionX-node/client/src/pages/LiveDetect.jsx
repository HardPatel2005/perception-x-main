import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import api from '../utils/axiosConfig'
import Dashboard from '../components/dashboard/traffic-monitoring/TrafficMonitoringDashboard'
import WildlifeDashboard from '../components/dashboard/wildlife-monitoring/WildlifeDashboard'
import RestaurantDashboard from '../components/dashboard/restaurant-monitoring/RestaurantDashboard'
import './LiveDetect.css'

// ─── Color palette for bounding boxes ────────────────────────────────
const BOX_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7'
]
function getClassColor(className) {
  let hash = 0
  for (let i = 0; i < className.length; i++) hash = className.charCodeAt(i) + ((hash << 5) - hash)
  return BOX_COLORS[Math.abs(hash) % BOX_COLORS.length]
}

const LiveDetect = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // ─── Phases: setup → detecting → saving → results ──────────────────
  const [phase, setPhase] = useState('setup') // setup | detecting | saving | results | error
  const [selectedServiceType, setSelectedServiceType] = useState('traffic-monitoring')

  // ─── Camera & WebSocket refs ───────────────────────────────────────
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const captureCanvasRef = useRef(null) // Off-screen canvas for JPEG capture
  const wsRef = useRef(null)
  const streamRef = useRef(null)
  const captureIntervalRef = useRef(null)
  const animFrameRef = useRef(null)

  // ─── Live detection state ──────────────────────────────────────────
  const [detections, setDetections] = useState([])
  const [fps, setFps] = useState(0)
  const [totalDetections, setTotalDetections] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [framesAnalyzed, setFramesAnalyzed] = useState(0)
  const [inferenceMs, setInferenceMs] = useState(0)
  const [uniqueObjects, setUniqueObjects] = useState({})
  const sessionStartRef = useRef(0)
  const eventsBufferRef = useRef([]) // Stores ALL detection events for the session
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  // ─── Results state ─────────────────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState(null)
  const [sessionFileId, setSessionFileId] = useState(null)
  const [sessionServiceType, setSessionServiceType] = useState('traffic-monitoring')
  const [sessionStats, setSessionStats] = useState({})
  const [error, setError] = useState(null)

  const serviceTypes = [
    { value: 'traffic-monitoring', label: 'Traffic Monitoring', description: 'Detect vehicles, pedestrians, and infrastructure' },
    { value: 'wildlife-monitoring', label: 'Wildlife & Livestock', description: 'Detect wildlife and animals' },
    { value: 'restaurant-monitoring', label: 'Restaurant & Kitchen', description: 'Detect food, utensils, and appliances' }
  ]

  // ─── FPS & duration counter ────────────────────────────────────────
  useEffect(() => {
    let timer
    if (phase === 'detecting') {
      timer = setInterval(() => {
        setSessionDuration(prev => prev + 1)
        // Calculate FPS
        const now = Date.now()
        const elapsed = (now - fpsCounterRef.current.lastTime) / 1000
        if (elapsed >= 1) {
          setFps(Math.round(fpsCounterRef.current.frames / elapsed))
          fpsCounterRef.current = { frames: 0, lastTime: now }
        }
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [phase])

  // ─── Draw bounding boxes on canvas ─────────────────────────────────
  const drawDetections = useCallback((dets) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth || video.clientWidth
    canvas.height = video.videoHeight || video.clientHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!dets || dets.length === 0) return

    const w = canvas.width
    const h = canvas.height

    dets.forEach(det => {
      const x1 = det.x1 * w
      const y1 = det.y1 * h
      const x2 = det.x2 * w
      const y2 = det.y2 * h
      const bw = x2 - x1
      const bh = y2 - y1

      const color = getClassColor(det.class)
      const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`

      // Draw box
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, bw, bh)

      // Draw label background
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif'
      const textW = ctx.measureText(label).width + 12
      const textH = 22
      ctx.fillStyle = color
      ctx.fillRect(x1, y1 - textH, textW, textH)

      // Draw label text
      ctx.fillStyle = '#fff'
      ctx.fillText(label, x1 + 6, y1 - 6)
    })
  }, [])

  // ─── Start detection ───────────────────────────────────────────────
  const startDetection = useCallback(async () => {
    try {
      setError(null)
      setDetections([])
      setTotalDetections(0)
      setSessionDuration(0)
      setFramesAnalyzed(0)
      setInferenceMs(0)
      setUniqueObjects({})
      setFps(0)
      eventsBufferRef.current = []
      fpsCounterRef.current = { frames: 0, lastTime: Date.now() }

      // Check if mediaDevices is supported (it may be undefined on HTTP network IPs)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      // Open camera (front for PC, back for mobile)
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      const facingMode = isMobile ? 'environment' : 'user'
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode 
        }
      })
      streamRef.current = stream

      // Connect WebSocket to Python backend
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = window.location.hostname
      const wsUrl = `${wsProtocol}//${wsHost}:8001/ws/live-detect?service_type=${selectedServiceType}`
      console.log(`🔗 Connecting to AI server: ${wsUrl}`);
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connection established');
        sessionStartRef.current = Date.now()
        setPhase('detecting') // This mounts the video element
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.error) {
            console.warn('⚠️ Server sent error:', data.error);
            if (data.error.includes("Model not loaded")) {
              setError("AI Model not loaded on server. Please check your Python backend logs.");
              setPhase('error');
              cleanup();
            }
            return
          }
          
          if (data.detections && data.detections.length > 0) {
            console.groupCollapsed(`📥 Frame ${data.frameId}: ${data.detections.length} objects detected`);
            data.detections.forEach((d, i) => {
              console.log(`   [${i+1}] ${d.class} (${(d.confidence * 100).toFixed(1)}%)`);
            });
            console.groupEnd();
          }

          // Update detections for drawing
          setDetections(data.detections || [])
          drawDetections(data.detections || [])

          // Update stats
          const detCount = (data.detections || []).length
          if (detCount > 0) {
            setTotalDetections(prev => prev + detCount)
          }
          setFramesAnalyzed(prev => prev + 1)
          setInferenceMs(data.inferenceMs || 0)
          fpsCounterRef.current.frames++

          // Track unique objects
          if (data.objectCounts) {
            setUniqueObjects(prev => {
              const next = { ...prev }
              for (const [cls, count] of Object.entries(data.objectCounts)) {
                next[cls] = (next[cls] || 0) + count
              }
              return next
            })
          }

          // Buffer this event for session save (only if detections > 0)
          if (detCount > 0) {
            eventsBufferRef.current.push({
              frameId: data.frameId,
              timestamp: data.timestamp,
              detections: data.detections,
              objectCounts: data.objectCounts,
              inferenceMs: data.inferenceMs
            })
          }
        } catch (e) {
          console.warn('WS message parse error:', e)
        }
      }

      ws.onerror = (e) => {
        console.error('WebSocket error:', e)
        setError('Connection to AI server failed (port 8001). Please ensure your Python backend is running.')
        setPhase('error')
        cleanup()
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
      }
    } catch (err) {
      console.error('Camera/WS error:', err)
      if (err.message === 'SECURE_CONTEXT_REQUIRED') {
        setError(
          'Mobile browsers block camera access on HTTP (except localhost). ' +
          'To test on your phone:\n' +
          '1. Open Chrome on your phone\n' +
          '2. Go to chrome://flags/#unsafely-treat-insecure-origin-as-secure\n' +
          `3. Add "http://${window.location.host}" to the list, enable it, and relaunch Chrome.`
        )
      } else if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access and try again.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError(`Failed to start: ${err.message}`)
      }
      setPhase('error')
    }
  }, [selectedServiceType, drawDetections])

  // ─── Attach stream when video element mounts ────────────────────────
  useEffect(() => {
    if (phase === 'detecting' && videoRef.current && streamRef.current) {
      console.log("📹 Setting source stream to mounted <video>...");
      videoRef.current.srcObject = streamRef.current;
      
      const handleVideoReady = () => {
        console.log("🎯 Video ready signal received (onloadedmetadata/oncanplay)");
        videoRef.current.play().then(() => {
          console.log("🚀 Video playing successfully. WxH:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
          // Start the capture loop once video is fully playing
          if (!captureIntervalRef.current) {
            startCapture();
          }
        }).catch(e => {
          console.error("❌ Video play failed:", e);
          setError("Failed to start video playback. Please check camera permissions.");
          setPhase("error");
        });
      };

      if (videoRef.current.readyState >= 2) {
        handleVideoReady();
      } else {
        videoRef.current.onloadedmetadata = handleVideoReady;
        videoRef.current.oncanplay = handleVideoReady;
      }
    }
  }, [phase])

  // ─── Frame capture loop ────────────────────────────────────────────
  const startCapture = useCallback(() => {
    const CAPTURE_INTERVAL = 150 // ~6-7 FPS
    console.log("🏁 Starting frame capture loop...");

    captureIntervalRef.current = setInterval(() => {
      const video = videoRef.current
      const ws = wsRef.current
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return
      
      // Ensure video is playing and has data
      if (video.paused || video.ended || video.readyState < 2) return
      if (video.videoWidth === 0 || video.videoHeight === 0) return

      // Calculate proportional dimensions to avoid squashing (crucial for accurate mobile portrait detection)
      const maxDim = 640;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > h) {
        h = Math.round((h / w) * maxDim);
        w = maxDim;
      } else {
        w = Math.round((w / h) * maxDim);
        h = maxDim;
      }

      // Create off-screen canvas for capture
      let captureCanvas = captureCanvasRef.current
      if (!captureCanvas) {
        captureCanvas = document.createElement('canvas')
        captureCanvasRef.current = captureCanvas
      }
      captureCanvas.width = w
      captureCanvas.height = h

      const ctx = captureCanvas.getContext('2d')
      ctx.drawImage(video, 0, 0, w, h)

      // Convert to JPEG and send as base64
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.65)
      ws.send(dataUrl)
      
      // log every 20 frames to avoid console flood
      if (Math.random() < 0.05) {
        console.log(`📤 Sending frame to AI... (Video: ${video.videoWidth}x${video.videoHeight}, Canvas: ${w}x${h})`);
      }
    }, CAPTURE_INTERVAL)
  }, [])

  // ─── Cleanup camera & WebSocket ────────────────────────────────────
  const cleanup = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // ─── Stop detection & save session ─────────────────────────────────
  const stopDetection = useCallback(async () => {
    cleanup()
    setPhase('saving')

    const events = eventsBufferRef.current
    const duration = (Date.now() - sessionStartRef.current) / 1000

    if (events.length === 0) {
      setError('No objects were detected during this session. Try again with objects in view.')
      setPhase('error')
      return
    }

    try {
      const response = await api.post('/api/live-session/save', {
        serviceType: selectedServiceType,
        detectionEvents: events,
        sessionDuration: duration,
        framesAnalyzed: framesAnalyzed
      })

      if (response.data.success) {
        setAnalyticsData(response.data.analyticsData)
        setSessionFileId(response.data.fileId)
        setSessionServiceType(response.data.serviceType)
        setSessionStats({
          totalEvents: response.data.totalEvents,
          duration: duration,
          filename: response.data.filename
        })
        setPhase('results')
      } else {
        setError(response.data.error || 'Failed to save session')
        setPhase('error')
      }
    } catch (err) {
      console.error('Save session error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to save session')
      setPhase('error')
    }
  }, [cleanup, selectedServiceType, framesAnalyzed])

  // Clean up on unmount
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // ─── Redraw bounding boxes continuously ────────────────────────────
  useEffect(() => {
    if (phase === 'detecting' && detections.length > 0) {
      drawDetections(detections)
    }
  }, [phase, detections, drawDetections])

  // ─── Format duration ───────────────────────────────────────────────
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ─── Sorted unique objects for display ─────────────────────────────
  const sortedObjects = useMemo(() => {
    return Object.entries(uniqueObjects)
      .sort((a, b) => b[1] - a[1])
  }, [uniqueObjects])

  // ─── Auth guard ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="live-detect-page">
        <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <div className="flex items-center justify-center px-4" style={{ paddingTop: '120px', minHeight: '60vh' }}>
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 shadow-sm text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-700 mb-6">Please log in to use live object detection.</p>
            <Link to="/login" className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors">
              Login Here
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="live-detect-page">
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <div style={{ paddingTop: '64px' }}>

        {/* ======== SETUP PHASE ======== */}
        {phase === 'setup' && (
          <div className="live-setup-panel">
            <div className="live-setup-card">
              <h2>Live Object Detection</h2>
              <p>Open your camera and detect objects in real-time using AI. After stopping, view full analytics.</p>

              <label htmlFor="liveServiceType">
                Select Detection Type <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="liveServiceType"
                value={selectedServiceType}
                onChange={(e) => setSelectedServiceType(e.target.value)}
              >
                {serviceTypes.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {selectedServiceType && (
                <p style={{ color: '#666', fontSize: '13px', marginTop: '-16px', marginBottom: '20px' }}>
                  {serviceTypes.find(s => s.value === selectedServiceType)?.description}
                </p>
              )}

              <button className="btn-start" onClick={startDetection}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Start Live Detection
              </button>
            </div>
          </div>
        )}

        {/* ======== DETECTING PHASE ======== */}
        {phase === 'detecting' && (
          <div className="live-camera-container">
            <div className="camera-viewport">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ transform: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'none' : 'scaleX(-1)' }}
              />
              <canvas 
                ref={canvasRef} 
                style={{ transform: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'none' : 'scaleX(-1)' }}
              />

              {/* HUD Overlay */}
              <div className="live-hud">
                <div className="hud-left">
                  <div className="live-badge">
                    <span className="pulse-dot" />
                    LIVE
                  </div>
                </div>
                <div className="hud-stats">
                  <div className="hud-stat">⏱ <span className="stat-value">{formatDuration(sessionDuration)}</span></div>
                  <div className="hud-stat">🎯 <span className="stat-value">{totalDetections}</span></div>
                  <div className="hud-stat">📊 <span className="stat-value">{fps} FPS</span></div>
                  <div className="hud-stat">⚡ <span className="stat-value">{inferenceMs.toFixed(0)}ms</span></div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="controls-bar">
              <button className="btn-stop" onClick={stopDetection}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                Stop Detection
              </button>
            </div>

            {/* Detected Objects Tags */}
            {sortedObjects.length > 0 && (
              <div className="detected-objects-panel">
                <h3>Detected Objects</h3>
                <div className="objects-grid">
                  {sortedObjects.map(([cls, count]) => (
                    <div key={cls} className="object-tag" style={{ background: `${getClassColor(cls)}15`, color: getClassColor(cls), borderColor: `${getClassColor(cls)}33` }}>
                      {cls}
                      <span className="tag-count" style={{ background: getClassColor(cls) }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== SAVING PHASE ======== */}
        {phase === 'saving' && (
          <div className="saving-overlay">
            <div className="spinner" />
            <h3>Analyzing Session...</h3>
            <p>Computing analytics from {eventsBufferRef.current.length} detection events</p>
          </div>
        )}

        {/* ======== RESULTS PHASE ======== */}
        {phase === 'results' && analyticsData && (
          <div className="live-analytics-container">
            <div className="live-analytics-header">
              <h2>📹 Live Session Analysis</h2>
              <div className="session-meta">
                <div className="meta-item">⏱ {formatDuration(Math.round(sessionStats.duration || 0))}</div>
                <div className="meta-item">🎯 {sessionStats.totalEvents || 0} detections</div>
                <div className="meta-item">📊 {framesAnalyzed} frames</div>
              </div>
              <button className="btn-new-session" onClick={() => {
                setPhase('setup')
                setAnalyticsData(null)
                setSessionFileId(null)
                setDetections([])
                setTotalDetections(0)
                setSessionDuration(0)
                setFramesAnalyzed(0)
                setUniqueObjects({})
              }}>
                New Session
              </button>
              <Link to={`/analytics/${sessionFileId}`} className="btn-new-session" style={{ background: '#3b82f6', textDecoration: 'none' }}>
                View Full Analytics
              </Link>
            </div>

            {/* Render the appropriate dashboard */}
            {sessionServiceType === 'wildlife-monitoring' ? (
              <WildlifeDashboard data={analyticsData} isVideo={false} />
            ) : sessionServiceType === 'restaurant-monitoring' ? (
              <RestaurantDashboard data={analyticsData} isVideo={false} />
            ) : (
              <Dashboard data={analyticsData} isVideo={false} />
            )}
          </div>
        )}

        {/* ======== ERROR PHASE ======== */}
        {phase === 'error' && (
          <div className="live-error">
            <h3>Detection Error</h3>
            <p>{error || 'An unexpected error occurred'}</p>
            <button className="btn-retry" onClick={() => { setPhase('setup'); setError(null) }}>
              Try Again
            </button>
          </div>
        )}
      </div>
      {(phase === 'setup' || phase === 'results') && <Footer />}
    </div>
  )
}

export default LiveDetect
