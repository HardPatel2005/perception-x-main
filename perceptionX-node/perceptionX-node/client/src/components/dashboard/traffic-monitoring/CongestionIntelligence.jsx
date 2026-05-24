import { motion } from 'framer-motion'
import { Activity, Clock, AlertTriangle } from 'lucide-react'

const CongestionIntelligence = ({ congestionIndex, congestionIntelligence, densityHeatmap }) => {
  // Convert heatmap data to grid format
  const heatmapGrid = Array(10).fill(null).map(() => Array(10).fill(0))
  
  if (densityHeatmap && densityHeatmap.length > 0) {
    densityHeatmap.forEach(cell => {
      if (cell.x < 10 && cell.y < 10) {
        heatmapGrid[cell.y][cell.x] = cell.density
      }
    })
  }

  const maxDensity = Math.max(...heatmapGrid.flat(), 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Congestion Metrics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-400" />
          Congestion Intelligence
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Congestion Index</p>
              <span className={`text-sm font-semibold ${
                congestionIndex > 70 ? 'text-red-400' :
                congestionIndex > 40 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {congestionIndex || 0}/100
              </span>
            </div>
            <div className="w-full bg-[#2a2a3a] rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  congestionIndex > 70 ? 'bg-red-500' :
                  congestionIndex > 40 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(congestionIndex || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2a2a3a] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-gray-400">Idle Ratio</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {congestionIntelligence?.idleVehicleRatio?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="bg-[#2a2a3a] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs text-gray-400">Jam Duration</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.round((congestionIntelligence?.totalJamDuration || 0) / 60)}m
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2a2a3a]">
            <p className="text-xs text-gray-400 mb-2">Idle Vehicles</p>
            <p className="text-lg font-semibold text-white">
              {congestionIntelligence?.idleVehicles || 0} / {congestionIntelligence?.totalVehicles || 0}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Density Heatmap */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Density Heatmap</h3>
        <div className="bg-[#2a2a3a] rounded-lg p-4">
          <div className="grid grid-cols-10 gap-1">
            {heatmapGrid.map((row, y) =>
              row.map((density, x) => {
                const intensity = maxDensity > 0 ? (density / maxDensity) * 100 : 0
                return (
                  <div
                    key={`${x}-${y}`}
                    className="aspect-square rounded"
                    style={{
                      backgroundColor: intensity > 70 
                        ? `rgba(239, 68, 68, ${intensity / 100})`
                        : intensity > 40
                        ? `rgba(251, 191, 36, ${intensity / 100})`
                        : `rgba(34, 197, 94, ${intensity / 100})`,
                      minHeight: '20px'
                    }}
                    title={`Density: ${density}`}
                  />
                )
              })
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </motion.div>
    </div>
  )
}

export default CongestionIntelligence
