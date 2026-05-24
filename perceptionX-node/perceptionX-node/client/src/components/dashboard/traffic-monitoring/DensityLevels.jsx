import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import VideoSnapshot from './VideoSnapshot'

const DensityLevels = ({ sceneDensity, videoUrl, isVideo, peakVehicleTimestamp, peakPedestrianTimestamp, peakVehicles, peakPedestrians }) => {
  const densityLevelColor = {
    'Very Low': 'text-green-600',
    'Low': 'text-green-400',
    'Moderate': 'text-yellow-400',
    'High': 'text-orange-400',
    'Very High': 'text-red-500'
  }

  const densityLevelBg = {
    'Very Low': 'bg-green-600/10 border-green-600/20',
    'Low': 'bg-green-500/10 border-green-500/20',
    'Moderate': 'bg-yellow-500/10 border-yellow-500/20',
    'High': 'bg-orange-500/10 border-orange-500/20',
    'Very High': 'bg-red-500/10 border-red-500/20'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-5 shadow-sm flex flex-col"
      style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
    >
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Activity className="w-4 h-4" style={{ color: '#2a2a2a' }} />
        Scene Density Levels
      </h3>
      <div className="flex-1 flex flex-col gap-3">
        {/* Density Cards Side by Side */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${densityLevelBg[sceneDensity?.vehicleDensityLevel || 'Very Low'] || densityLevelBg['Very Low']}`} style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Vehicle Density</span>
              <span className={`text-xs font-semibold ${densityLevelColor[sceneDensity?.vehicleDensityLevel || 'Very Low'] || densityLevelColor['Very Low']}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {sceneDensity?.vehicleDensityLevel || 'Very Low'}
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {sceneDensity?.avgVehicleDensity || 0} per frame
            </p>
          </div>

          <div className={`p-3 rounded-lg border ${densityLevelBg[sceneDensity?.pedestrianDensityLevel || 'Very Low'] || densityLevelBg['Very Low']}`} style={{ background: 'rgba(236, 72, 153, 0.05)', borderColor: 'rgba(236, 72, 153, 0.2)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Pedestrian Density</span>
              <span className={`text-xs font-semibold ${densityLevelColor[sceneDensity?.pedestrianDensityLevel || 'Very Low'] || densityLevelColor['Very Low']}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {sceneDensity?.pedestrianDensityLevel || 'Very Low'}
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {sceneDensity?.avgPedestrianDensity || 0} per frame
            </p>
          </div>
        </div>

        {/* Snapshots Below - Side by Side with Integrated Label Cards */}
        {(isVideo && videoUrl && (peakVehicleTimestamp !== null && peakVehicleTimestamp !== undefined || peakPedestrianTimestamp !== null && peakPedestrianTimestamp !== undefined)) && (
          <div className="grid grid-cols-2 gap-3 items-stretch">
            {isVideo && videoUrl && peakVehicleTimestamp !== null && peakVehicleTimestamp !== undefined && (
              <div className="flex">
                <VideoSnapshot
                  videoUrl={videoUrl}
                  timestamp={peakVehicleTimestamp}
                  label="Peak Vehicles"
                  peakCount={peakVehicles}
                />
              </div>
            )}
            {isVideo && videoUrl && peakPedestrianTimestamp !== null && peakPedestrianTimestamp !== undefined && (
              <div className="flex">
                <VideoSnapshot
                  videoUrl={videoUrl}
                  timestamp={peakPedestrianTimestamp}
                  label="Peak Pedestrians"
                  peakCount={peakPedestrians}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default DensityLevels
