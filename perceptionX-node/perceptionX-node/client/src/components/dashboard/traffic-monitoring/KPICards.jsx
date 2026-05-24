import { motion } from 'framer-motion'
import { Car, Activity, Users, AlertTriangle, Clock, TrendingUp, Target, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const KPICard = ({ icon: Icon, label, value, change, changeType, gradient, sparklineData, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative rounded-xl bg-[#23233a] p-5 hover:bg-[#2a2a3a] transition-all group overflow-hidden`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">{label}</p>
          <div className="mt-1 flex items-center gap-2">
            <Icon className={`h-5 w-5 ${gradient.includes('blue') ? 'text-[#3b82f6]' : gradient.includes('orange') ? 'text-[#f97316]' : gradient.includes('pink') ? 'text-[#c840e9]' : gradient.includes('red') ? 'text-[#ef4444]' : 'text-[#c840e9]'}`} />
            <span className="text-2xl font-bold text-white">{value}</span>
          </div>
        </div>
      </div>
      {sparklineData && (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <XAxis dataKey="m" tick={{ fill: "#8b8b9e", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 150]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={gradient.includes('blue') ? '#3b82f6' : gradient.includes('orange') ? '#f97316' : gradient.includes('pink') ? '#c840e9' : gradient.includes('red') ? '#ef4444' : '#c840e9'}
                strokeWidth={2}
                dot={{ fill: gradient.includes('blue') ? '#3b82f6' : gradient.includes('orange') ? '#f97316' : gradient.includes('pink') ? '#c840e9' : gradient.includes('red') ? '#ef4444' : '#c840e9', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

const KPICards = ({ data }) => {
  // Generate sparkline data from temporal trends
  const generateSparklineData = (trendData, dataKey = 'vehicles') => {
    if (!trendData || trendData.length === 0) {
      return Array(6).fill(0).map((_, i) => ({ m: `${i}`, value: 0 }))
    }
    // Sample data points for sparkline (last 6 data points)
    const sampleSize = Math.min(6, trendData.length)
    return trendData
      .slice(-sampleSize)
      .map((item, i) => ({ 
        m: `${i}`, 
        value: item[dataKey] || 0 
      }))
  }

  // Get detection-based metrics
  const sceneOverview = data.sceneOverview || {}
  const sceneDensity = data.sceneDensity || {}
  const confidenceAnalytics = data.confidenceAnalytics || {}
  const performanceMetrics = data.performanceMetrics || {}
  const temporalTrends = data.temporalTrends || []
  const alerts = data.alerts || []

  // Calculate detection rate (detections per minute)
  const totalDetections = sceneOverview.totalObjects || 0
  const totalFrames = sceneOverview.totalFrames || 1
  const avgFPS = performanceMetrics.fps || 1
  const videoDurationMinutes = totalFrames / (avgFPS * 60) || 1
  const detectionsPerMinute = Math.round(totalDetections / videoDurationMinutes)

  // Generate sparklines from temporal trends
  const vehicleSparkline = generateSparklineData(temporalTrends, 'vehicles')
  const pedestrianSparkline = generateSparklineData(temporalTrends, 'pedestrians')
  
  // Confidence trend sparkline (convert to percentage)
  const confidenceTrend = confidenceAnalytics.confidenceTrend || []
  const confidenceSparkline = confidenceTrend.length > 0
    ? generateSparklineData(confidenceTrend, 'avgConfidence').map(item => ({ 
        ...item, 
        value: Math.round((item.value || 0) * 100) 
      }))
    : Array(6).fill(0).map((_, i) => ({ m: `${i}`, value: 0 }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        icon={Car}
        label="Estimated Unique Vehicles"
        value={sceneOverview.vehicles?.toLocaleString() || '0'}
        change={`Peak: ${sceneOverview.peakVehicles || 0}`}
        changeType="up"
        gradient="from-blue-500/10 to-purple-500/10"
        sparklineData={vehicleSparkline}
        delay={0.1}
      />
      <KPICard
        icon={Users}
        label="Estimated Unique Pedestrians"
        value={sceneOverview.pedestrians?.toLocaleString() || '0'}
        change={`Peak: ${sceneOverview.peakPedestrians || 0}`}
        changeType="up"
        gradient="from-pink-500/10 to-rose-500/10"
        sparklineData={pedestrianSparkline}
        delay={0.2}
      />
      <KPICard
        icon={Zap}
        label="Detection Rate"
        value={`${detectionsPerMinute}/min`}
        change={`${sceneOverview.totalFrames || 0} frames`}
        changeType="up"
        gradient="from-orange-500/10 to-yellow-500/10"
        sparklineData={vehicleSparkline}
        delay={0.3}
      />
      <KPICard
        icon={Target}
        label="Avg Confidence"
        value={`${((confidenceAnalytics.avgConfidence || 0) * 100).toFixed(1)}%`}
        change={confidenceAnalytics.lowConfidenceCount > 0 ? `${confidenceAnalytics.lowConfidenceCount} low` : 'High'}
        changeType={confidenceAnalytics.avgConfidence > 0.7 ? 'down' : 'up'}
        gradient="from-green-500/10 to-emerald-500/10"
        sparklineData={confidenceSparkline}
        delay={0.4}
      />
      <KPICard
        icon={AlertTriangle}
        label="Detection Alerts"
        value={alerts.length || 0}
        change={alerts.length > 0 ? `${alerts.filter(a => a.severity === 'high').length} high` : 'None'}
        changeType={alerts.length > 0 ? 'up' : 'down'}
        gradient="from-red-500/10 to-pink-500/10"
        sparklineData={vehicleSparkline}
        delay={0.5}
      />
    </div>
  )
}

export default KPICards
