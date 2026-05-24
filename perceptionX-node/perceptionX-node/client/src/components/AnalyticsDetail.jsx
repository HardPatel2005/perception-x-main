import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../utils/axiosConfig'
import Dashboard from './dashboard/traffic-monitoring/TrafficMonitoringDashboard'
import WildlifeDashboard from './dashboard/wildlife-monitoring/WildlifeDashboard'
import RestaurantDashboard from './dashboard/restaurant-monitoring/RestaurantDashboard'

const AnalyticsDetail = () => {
  const { fileId } = useParams()
  const [analyticsData, setAnalyticsData] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const fetchAnalytics = async () => {
      if (!fileId) {
        if (isMounted) {
          setError('No file ID provided')
          setLoading(false)
        }
        return
      }

      try {
        console.log(`📡 Fetching analytics for file: ${fileId}`);
        const response = await api.get(`/api/analytics/${fileId}`, {
          timeout: 75000 // 75 second timeout for large files
        })
        console.log(`✅ Analytics received for file: ${fileId}`);
        
        if (isMounted) {
          // Clear timeout immediately when data arrives to prevent race condition
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          
          console.log(`📊 Setting analytics data for file: ${fileId}`);
          const receivedServiceType = response.data.serviceType || 'traffic-monitoring';
          console.log(`📊 Received serviceType from API: ${receivedServiceType}`);
          setAnalyticsData(response.data.analyticsData)
          setFileInfo({
            filename: response.data.filename,
            uploadDate: response.data.uploadDate,
            mimetype: response.data.mimetype,
            totalEvents: response.data.totalEvents,
            originalUrl: response.data.originalUrl,
            processedUrl: response.data.processedUrl,
            isVideo: response.data.isVideo,
            serviceType: receivedServiceType
          })
          setLoading(false)
          setError(null) // Clear any previous errors
          console.log(`✅ Analytics data set successfully for file: ${fileId}`);
        }
      } catch (err) {
        if (isMounted) {
          // Clear timeout on error too
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          
          console.error('Error fetching analytics:', err)
          let errorMessage = 'Failed to load analytics data'
          if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
            errorMessage = 'Backend server not running. Please start the Node.js server on port 3000.'
          } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            errorMessage = 'Request timed out. Analytics computation is taking longer than expected.'
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

    fetchAnalytics()

    // Safety timeout - only trigger if still loading after axios timeout + buffer
    // Must be longer than axios timeout to avoid false positives
    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        // Check loading state at timeout execution time, not closure time
        setLoading(currentLoading => {
          if (currentLoading) {
            console.warn(`⏱️ Safety timeout reached for file: ${fileId}`);
            setError('Request timed out. Analytics computation is taking longer than expected. The file may be very large.')
            return false
          }
          return currentLoading
        })
      }
    }, 90000) // 90 second safety timeout (longer than 75s axios timeout)

    return () => {
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [fileId])

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    const seconds = parseFloat(timestamp)
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Process analytics data for display
  const processedData = useMemo(() => {
    if (!analyticsData) return null

    const formattedAlerts = (analyticsData.alerts || []).map(alert => ({
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      timestamp: formatTimestamp(alert.timestamp),
      frame: alert.frame
    }))

    const serviceType = fileInfo?.serviceType || 'traffic-monitoring'

    if (serviceType === 'wildlife-monitoring') {
      return {
        sceneOverview: analyticsData.sceneOverview || {},
        sceneDensity: analyticsData.sceneDensity || {},
        speciesDistribution: analyticsData.speciesDistribution || [],
        temporalTrends: analyticsData.temporalTrends || [],
        confidenceAnalytics: analyticsData.confidenceAnalytics || {},
        alerts: formattedAlerts,
        performanceMetrics: analyticsData.performanceMetrics || {}
      }
    }

    if (serviceType === 'restaurant-monitoring') {
      // sceneDensity.frames always has chairs/tables/persons per frame (even cached data)
      const densityFrames = analyticsData.sceneDensity?.frames || []

      // Derive occupancyData from sceneDensity.frames when missing (cached data)
      const derivedOccupancyData = analyticsData.occupancyData?.length > 0
        ? analyticsData.occupancyData
        : densityFrames.map(f => ({
            frame: f.frame,
            persons: f.persons || 0,
            chairs: f.chairs || 0,
            tables: f.tables || 0,
            seatFillRate: f.chairs > 0 ? Math.min(Math.round(((f.persons || 0) / f.chairs) * 100), 200) : 0,
            inferenceMs: 0
          }))

      // Derive framesData from sceneDensity.frames when missing
      const derivedFramesData = analyticsData.framesData?.length > 0
        ? analyticsData.framesData
        : densityFrames.map(f => ({
            frame: f.frame,
            persons: f.persons || 0,
            chairs: f.chairs || 0,
            tables: f.tables || 0,
            remotes: 0,
            inferenceMs: 0,
            isAnomaly: (f.persons || 0) > 4
          }))

      // Derive anomalyTimeline from occupancyData when missing
      const derivedAnomalyTimeline = analyticsData.anomalyTimeline?.length > 0
        ? analyticsData.anomalyTimeline
        : derivedOccupancyData.map(d => {
            let status = 'empty'
            if (d.persons > 4)       status = 'overcrowded'
            else if (d.persons > 2)  status = 'busy'
            else if (d.persons > 0)  status = 'normal'
            else if (d.chairs > 8)   status = 'busy'    // many chairs = busy setup
            else if (d.chairs > 0)   status = 'normal'  // chairs present = set up
            return { frame: d.frame, status, persons: d.persons, chairs: d.chairs, foodItems: 0 }
          })

      // Derive inferenceHistogram: prefer real data, fall back to items-per-frame distribution
      const existingHistogram = analyticsData.inferenceHistogram || []
      const hasInferenceData = existingHistogram.some(b => b.count > 0)
      const latencyTrend = analyticsData.performanceMetrics?.latencyTrend || []
      const hasLatencyData = latencyTrend.some(t => (t.latency || 0) > 0)

      let derivedHistogram = existingHistogram
      if (!hasInferenceData && hasLatencyData) {
        // Build histogram from latency trend
        const bins = [
          { bin: '<50ms', min: 0, max: 50, count: 0 }, { bin: '50-75ms', min: 50, max: 75, count: 0 },
          { bin: '75-100ms', min: 75, max: 100, count: 0 }, { bin: '100-150ms', min: 100, max: 150, count: 0 },
          { bin: '>150ms', min: 150, max: Infinity, count: 0 }
        ]
        latencyTrend.forEach(t => {
          const ms = t.latency || 0
          if (ms > 0) { const bin = bins.find(b => ms >= b.min && ms < b.max); if (bin) bin.count++ }
        })
        derivedHistogram = bins.map(({ bin, count }) => ({ bin, count }))
      } else if (!hasInferenceData && densityFrames.length > 0) {
        // Fall back to items-per-frame distribution (chairs + tables per frame)
        const bins = [
          { bin: '0 items', count: 0 }, { bin: '1–3', count: 0 },
          { bin: '4–7', count: 0 }, { bin: '8–12', count: 0 }, { bin: '13+', count: 0 }
        ]
        densityFrames.forEach(f => {
          const n = (f.totalItems || 0) + (f.chairs || 0) + (f.tables || 0)
          if (n === 0)       bins[0].count++
          else if (n <= 3)   bins[1].count++
          else if (n <= 7)   bins[2].count++
          else if (n <= 12)  bins[3].count++
          else               bins[4].count++
        })
        derivedHistogram = bins.map(b => ({ ...b, isItemDist: true }))
      }

      return {
        sceneOverview: analyticsData.sceneOverview || {},
        sceneDensity: analyticsData.sceneDensity || {},
        occupancyData: derivedOccupancyData,
        inferenceHistogram: derivedHistogram,
        anomalyTimeline: derivedAnomalyTimeline,
        framesData: derivedFramesData,
        itemDistribution: analyticsData.itemDistribution || [],
        categoryDistribution: analyticsData.categoryDistribution || [],
        temporalTrends: analyticsData.temporalTrends || [],
        confidenceAnalytics: analyticsData.confidenceAnalytics || {},
        alerts: formattedAlerts,
        performanceMetrics: analyticsData.performanceMetrics || {}
      }
    }

    // Default: traffic monitoring
    return {
      sceneOverview: analyticsData.sceneOverview || {},
      sceneDensity: analyticsData.sceneDensity || {},
      objectDistribution: analyticsData.objectDistribution || [],
      temporalTrends: analyticsData.temporalTrends || [],
      confidenceAnalytics: analyticsData.confidenceAnalytics || {},
      alerts: formattedAlerts,
      performanceMetrics: analyticsData.performanceMetrics || {}
    }
  }, [analyticsData, fileInfo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff', paddingTop: '64px' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#2a2a2a] rounded-full animate-spin mb-4"></div>
          <p style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analyticsData || !processedData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#ffffff', paddingTop: '64px' }}>
        <div className="bg-white border rounded-xl p-8 max-w-md w-full text-center" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <h3 className="font-semibold text-xl mb-2" style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Error</h3>
          <p className="mb-4" style={{ color: '#991b1b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{error || 'No analytics data available'}</p>
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
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const serviceType = fileInfo?.serviceType || 'traffic-monitoring'
  console.log(`🎯 Rendering dashboard for serviceType: ${serviceType}`)

  if (serviceType === 'wildlife-monitoring') {
    return (
      <WildlifeDashboard
        data={processedData}
        videoUrl={fileInfo?.processedUrl}
        isVideo={fileInfo?.isVideo}
      />
    )
  }

  if (serviceType === 'restaurant-monitoring') {
    return (
      <RestaurantDashboard
        data={processedData}
        videoUrl={fileInfo?.processedUrl}
        isVideo={fileInfo?.isVideo}
      />
    )
  }

  return (
    <Dashboard
      data={processedData}
      videoUrl={fileInfo?.processedUrl}
      isVideo={fileInfo?.isVideo}
    />
  )
}

export default AnalyticsDetail
