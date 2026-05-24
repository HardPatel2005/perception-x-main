import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../../Navbar'
import Sidebar from '../shared/Sidebar'
import VideoPreviewCard from './VideoPreviewCard'
import SceneOverview from './SceneOverview'
import DensityLevels from './DensityLevels'
import SceneDensity from './SceneDensity'
import ObjectDistribution from './ObjectDistribution'
import TemporalDetectionTrends from './TemporalDetectionTrends'
import ConfidenceAnalytics from './ConfidenceAnalytics'
import DetectionAlerts from './DetectionAlerts'
import PerformanceMonitoring from './PerformanceMonitoring'

const TrafficMonitoringDashboard = ({ data, videoUrl, isVideo }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isDetailPage = location.pathname.startsWith('/analytics/') && location.pathname !== '/analytics'

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#fafafa' }}>
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '64px' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className={`flex flex-1 flex-col overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'}`}>
        <main className="flex-1 p-6">
          {/* Back Button - Only show on detail pages */}
          {isDetailPage && (
            <div className="mb-6">
              <button
                onClick={() => navigate('/analytics')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: '#000000',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  background: '#ffffff',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.12)'
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Analytics</span>
              </button>
            </div>
          )}
          
          <div className="flex flex-col gap-6">
            {/* Live Traffic Video Preview */}
            <VideoPreviewCard
              videoUrl={videoUrl}
              isVideo={isVideo}
              vehicleCount={data.sceneOverview?.vehicles || 0}
              pedestrianCount={data.sceneOverview?.pedestrians || 0}
              density={data.sceneDensity?.vehicleDensityLevel || 'Low'}
              signalStatus="Active"
              peakVehicles={data.sceneOverview?.peakVehicles || 0}
              peakPedestrians={data.sceneOverview?.peakPedestrians || 0}
              totalFrames={data.sceneOverview?.totalFrames || 0}
            />

            {/* Scene Overview */}
            <SceneOverview sceneOverview={data.sceneOverview} />

            {/* Density Levels and Object Distribution Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DensityLevels
                sceneDensity={data.sceneDensity}
                videoUrl={videoUrl}
                isVideo={isVideo}
                peakVehicleTimestamp={data.sceneOverview?.peakVehicleTimestamp}
                peakPedestrianTimestamp={data.sceneOverview?.peakPedestrianTimestamp}
                peakVehicles={data.sceneOverview?.peakVehicles}
                peakPedestrians={data.sceneOverview?.peakPedestrians}
              />
              <ObjectDistribution objectDistribution={data.objectDistribution} />
            </div>

            {/* Density Trend - Full Width */}
            <SceneDensity sceneDensity={data.sceneDensity} />

            {/* Temporal Detection Trends */}
            <TemporalDetectionTrends temporalTrends={data.temporalTrends} />

            {/* Confidence Analytics */}
            <ConfidenceAnalytics confidenceAnalytics={data.confidenceAnalytics} />

            {/* Detection-Based Alerts */}
            <DetectionAlerts alerts={data.alerts} />

            {/* Performance Monitoring */}
            <PerformanceMonitoring performanceMetrics={data.performanceMetrics} />
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

export default TrafficMonitoringDashboard
