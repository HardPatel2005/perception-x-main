import { useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../../Navbar'
import Sidebar from '../shared/Sidebar'
import RestaurantPreview from './RestaurantPreview'
import KPICards from './KPICards'
import OccupancyOverTime from './OccupancyOverTime'
import SeatingUtilization from './SeatingUtilization'
import SeatFillRate from './SeatFillRate'
import ObjectDistributionChart from './ObjectDistributionChart'
import DetectionHistogram from './DetectionHistogram'
import CorrelationScatter from './CorrelationScatter'
import DiningTableTimeline from './DiningTableTimeline'
import AnomalyTimelineViz from './AnomalyTimelineViz'
import CategoryDistributionChart from './CategoryDistributionChart'
import RestaurantDensityTrend from './RestaurantDensityTrend'
import TemporalTrends from './TemporalTrends'
import ConfidenceSection from './ConfidenceSection'
import AlertsPanel from './AlertsPanel'
import RawDataTable from './RawDataTable'
import PerformanceSection from './PerformanceSection'

const RestaurantDashboard = ({ data, videoUrl, isVideo }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isDetail = location.pathname.startsWith('/analytics/') && location.pathname !== '/analytics'
  const videoPreviewRef = useRef(null)

  // Central flags — used to make every chart adaptive
  const hasPersonData = useMemo(() =>
    data.occupancyData?.some(d => d.persons > 0) ?? false
  , [data.occupancyData])

  const maxChairs = useMemo(() =>
    data.occupancyData?.length > 0 ? Math.max(...data.occupancyData.map(d => d.chairs), 0) : 0
  , [data.occupancyData])

  const handleChartClick = (timeInSeconds) => {
    if (videoPreviewRef.current && videoPreviewRef.current.seekToTime) {
      videoPreviewRef.current.seekToTime(timeInSeconds)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#fafafa' }}>
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: 64 }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <div className={`flex flex-1 flex-col overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'}`}>
        <main className="flex-1 p-6">
          {isDetail && (
            <div className="mb-6">
              <button onClick={() => navigate('/analytics')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ color: '#000', border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <ArrowLeft className="w-4 h-4" /><span>Back to Analytics</span>
              </button>
            </div>
          )}

          <div className="flex flex-col gap-6 pb-6">
            {/* 1. Video Preview */}
            <RestaurantPreview ref={videoPreviewRef} videoUrl={videoUrl} isVideo={isVideo} data={data}
              hasPersonData={hasPersonData} maxChairs={maxChairs} />

            {/* 2. KPI Cards */}
            <KPICards
              sceneOverview={data.sceneOverview}
              occupancyData={data.occupancyData}
              anomalyTimeline={data.anomalyTimeline}
              sceneDensity={data.sceneDensity}
            />

            {/* 3. Occupancy / Chair Count Over Time */}
            <OccupancyOverTime 
              occupancyData={data.occupancyData} 
              sceneOverview={data.sceneOverview} 
              hasPersonData={hasPersonData}
              onChartClick={handleChartClick}
            />

            {/* 4. Furniture / Seating | Fill Rate / Chairs-per-Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SeatingUtilization occupancyData={data.occupancyData} hasPersonData={hasPersonData} />
              <SeatFillRate occupancyData={data.occupancyData} hasPersonData={hasPersonData} />
            </div>

            {/* 5. Object Distribution | Detection Histogram */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ObjectDistributionChart itemDistribution={data.itemDistribution} />
              <DetectionHistogram inferenceHistogram={data.inferenceHistogram} />
            </div>

            {/* 6. Scatter | Dining Table Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CorrelationScatter occupancyData={data.occupancyData} hasPersonData={hasPersonData} />
              <DiningTableTimeline occupancyData={data.occupancyData} />
            </div>

            {/* 7. Anomaly Timeline */}
            <AnomalyTimelineViz anomalyTimeline={data.anomalyTimeline} hasPersonData={hasPersonData} />

            {/* 8. Category | Density Over Time */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CategoryDistributionChart categoryDistribution={data.categoryDistribution} />
              <div className="lg:col-span-2">
                <RestaurantDensityTrend sceneDensity={data.sceneDensity} />
              </div>
            </div>

            {/* 9. Temporal Trends */}
            <TemporalTrends temporalTrends={data.temporalTrends} />

            {/* 10. Confidence */}
            <ConfidenceSection confidenceAnalytics={data.confidenceAnalytics} />

            {/* 11. Alerts */}
            <AlertsPanel alerts={data.alerts} />

            {/* 12. Raw Data Table */}
            <RawDataTable framesData={data.framesData} />

            {/* 13. Performance */}
            <PerformanceSection performanceMetrics={data.performanceMetrics} />
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

export default RestaurantDashboard
