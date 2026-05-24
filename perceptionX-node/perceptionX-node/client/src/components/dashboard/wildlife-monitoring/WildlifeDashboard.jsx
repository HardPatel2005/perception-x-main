import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, TrendingUp, FileVideo, Activity, PawPrint, Shield, AlertTriangle, Target, AlertCircle, Gauge, Zap, Clock, Bug } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import Navbar from '../../Navbar'
import Sidebar from '../shared/Sidebar'

const SPECIES_COLORS = {
  Elephant: '#6366f1', Giraffe: '#f59e0b', Zebra: '#1e293b', Bear: '#92400e',
  Horse: '#a16207', Cow: '#65a30d', Sheep: '#d1d5db', Dog: '#f97316',
  Cat: '#ec4899', Bird: '#0ea5e9', Deer: '#7c3aed', Lion: '#dc2626',
  Tiger: '#f97316', Wolf: '#64748b', Fox: '#ea580c', Rabbit: '#f9a8d4',
  Other: '#6b7280'
}

const CATEGORY_COLORS = {
  'Livestock': '#16a34a',
  'Wild Animals': '#7c3aed',
  'Pets': '#ec4899',
  'Predators': '#dc2626',
  Other: '#6b7280'
}

/* ─── Video Preview ─── */
const WildlifePreview = ({ videoUrl, isVideo, data }) => (
  <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Camera className="w-5 h-5" style={{ color: '#16a34a' }} />
      Wildlife Scene Preview
    </h3>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 relative bg-black rounded-xl overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
        {videoUrl ? (
          isVideo ? (
            <video controls autoPlay loop muted playsInline className="w-full h-full object-contain" preload="auto">
              <source src={videoUrl} type="video/mp4" />
            </video>
          ) : (
            <img src={videoUrl} alt="Wildlife Preview" className="w-full h-full object-contain" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: '#999999' }}>
            <div className="text-center">
              <PawPrint className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No media available</p>
            </div>
          </div>
        )}
      </div>
      <div className="bg-gray-50 rounded-xl p-5 flex flex-col justify-between shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#16a34a' }} />
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Peak Animals</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{data.sceneOverview?.peakAnimals || 0}</p>
            <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Max in single frame</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PawPrint className="w-4 h-4" style={{ color: '#7c3aed' }} />
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Species Diversity</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{data.sceneOverview?.speciesDiversity || 0}</p>
            <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Unique species detected</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileVideo className="w-4 h-4" style={{ color: '#9333ea' }} />
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Frames Analyzed</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{data.sceneOverview?.totalFrames || 0}</p>
            <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Total frames processed</p>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: '#f97316' }} />
            <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Animal Activity</span>
          </div>
          <p className={`text-lg font-bold ${
            data.sceneOverview?.animalActivityLevel === 'Very High' ? 'text-red-600' :
            data.sceneOverview?.animalActivityLevel === 'High' ? 'text-red-500' :
            data.sceneOverview?.animalActivityLevel === 'Moderate' ? 'text-yellow-500' :
            data.sceneOverview?.animalActivityLevel === 'Low' ? 'text-green-500' :
            'text-green-600'
          }`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {data.sceneOverview?.animalActivityLevel || 'Very Low'}
          </p>
        </div>
      </div>
    </div>
  </div>
)

/* ─── Scene Overview ─── */
const WildlifeOverview = ({ sceneOverview }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[
      { label: 'Avg Animals/Frame', value: sceneOverview?.avgAnimalsPerFrame?.toFixed(1) || '0.0', sub: `${sceneOverview?.totalFrames || 0} frames analyzed`, icon: PawPrint, color: '#16a34a' },
      { label: 'Most Common Species', value: sceneOverview?.mostCommonSpecies || 'N/A', sub: `${sceneOverview?.mostCommonSpeciesPercentage || 0}% of detections`, icon: Bug, color: '#7c3aed' },
      { label: 'Predators Detected', value: sceneOverview?.predators || 0, sub: 'Bears, wolves, etc.', icon: AlertTriangle, color: '#dc2626' },
      { label: 'Livestock Count', value: sceneOverview?.livestock || 0, sub: 'Cows, sheep, horses', icon: PawPrint, color: '#f59e0b' }
    ].map((item, idx) => {
      const Icon = item.icon
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
          className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ background: `${item.color}15` }}>
              <Icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{item.label}</span>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{item.value}</p>
          <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{item.sub}</p>
        </motion.div>
      )
    })}
  </div>
)

/* ─── Species Distribution (Pie) ─── */
const SpeciesDistribution = ({ speciesDistribution }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-5 shadow-sm flex flex-col" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Species Distribution</h3>
      {speciesDistribution && speciesDistribution.length > 0 ? (
        <div className="flex-1 flex flex-col gap-3">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={speciesDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={4} dataKey="value">
                {speciesDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SPECIES_COLORS[entry.name] || SPECIES_COLORS.Other}
                    opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.3 : 1}
                    style={{ transition: 'all 0.2s ease', cursor: 'pointer' }} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', fontSize: '13px' }}
                formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2.5">
            {speciesDistribution.slice(0, 8).map((item, idx) => (
              <div key={idx} className="rounded-lg p-3 transition-all duration-200 cursor-pointer border"
                style={{ backgroundColor: hoveredIndex === idx ? '#f5f5f5' : '#fafafa', borderColor: hoveredIndex === idx ? 'rgba(22, 163, 74, 0.3)' : 'rgba(0, 0, 0, 0.08)' }}
                onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SPECIES_COLORS[item.name] || SPECIES_COLORS.Other }} />
                  <span className="text-xs font-medium" style={{ color: '#666666' }}>{item.name}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: '#000000' }}>{item.value}</p>
                <p className="text-xs" style={{ color: '#999999' }}>{item.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8" style={{ color: '#999999' }}><p className="text-sm">No species detections</p></div>
      )}
    </motion.div>
  )
}

/* ─── Density Levels Card ─── */
const WildlifeDensityLevels = ({ sceneDensity, sceneOverview }) => {
  const getLevelColor = (level) => {
    const map = { 'Very High': '#dc2626', 'High': '#f59e0b', 'Moderate': '#eab308', 'Low': '#16a34a', 'Very Low': '#22c55e' }
    return map[level] || '#6b7280'
  }
  const getLevelWidth = (level) => {
    const map = { 'Very High': '100%', 'High': '80%', 'Moderate': '60%', 'Low': '40%', 'Very Low': '20%' }
    return map[level] || '10%'
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-5 shadow-sm flex flex-col" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
      <h3 className="text-base font-semibold mb-4" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Animal Density Levels</h3>
      <div className="space-y-6 flex-1">
        {/* Animal Density */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#666666' }}>Animal Density</span>
            <span className="text-sm font-bold" style={{ color: getLevelColor(sceneDensity?.animalDensityLevel) }}>{sceneDensity?.animalDensityLevel || 'Very Low'}</span>
          </div>
          <div className="w-full rounded-full h-3" style={{ background: '#e5e7eb' }}>
            <div className="h-3 rounded-full transition-all duration-700" style={{ width: getLevelWidth(sceneDensity?.animalDensityLevel), background: `linear-gradient(90deg, ${getLevelColor(sceneDensity?.animalDensityLevel)}80, ${getLevelColor(sceneDensity?.animalDensityLevel)})` }} />
          </div>
          <p className="text-xs mt-2" style={{ color: '#999999' }}>Avg: {sceneDensity?.avgAnimalDensity || 0} animals/frame</p>
        </div>

        {/* Activity Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#666666' }}>Activity Score</span>
            <span className="text-sm font-bold" style={{ color: '#16a34a' }}>{sceneOverview?.animalActivityScore || 0}/100</span>
          </div>
          <div className="w-full rounded-full h-3" style={{ background: '#e5e7eb' }}>
            <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${sceneOverview?.animalActivityScore || 0}%`, background: 'linear-gradient(90deg, #16a34a80, #16a34a)' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: '#999999' }}>Detection frequency: {sceneOverview?.animalDetectionFrequency || 0}%</p>
        </div>

        {/* Species Breakdown */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg p-3 text-center" style={{ background: '#f0fdf4', border: '1px solid rgba(22, 163, 74, 0.15)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Livestock</p>
            <p className="text-xl font-bold" style={{ color: '#16a34a' }}>{sceneOverview?.livestock || 0}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#faf5ff', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Wild</p>
            <p className="text-xl font-bold" style={{ color: '#7c3aed' }}>{sceneOverview?.wildAnimals || 0}</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#fdf2f8', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Pets</p>
            <p className="text-xl font-bold" style={{ color: '#ec4899' }}>{sceneOverview?.pets || 0}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Density Trend Chart ─── */
const WildlifeDensityTrend = ({ sceneDensity }) => {
  const frames = sceneDensity?.frames || []
  const totalFrames = sceneDensity?.totalFrames || 0
  const videoDuration = sceneDensity?.videoDurationSeconds || totalFrames / 30
  const useMinutes = videoDuration >= 120

  const chartData = frames.map((frame, idx) => {
    const frameNumber = frame.frame !== undefined ? frame.frame : idx
    const progress = totalFrames > 1 ? frameNumber / (totalFrames - 1) : 0
    const timeInSeconds = progress * videoDuration
    return { time: timeInSeconds, timeInSeconds, livestock: frame.livestock || 0, wild: frame.wild || 0, total: frame.totalAnimals || 0 }
  })

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <TrendingUp className="w-5 h-5" style={{ color: '#16a34a' }} /> Animal Density Over Time
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="livestockGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.6} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0.1} /></linearGradient>
            <linearGradient id="wildGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.6} /><stop offset="100%" stopColor="#7c3aed" stopOpacity={0.1} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin', 'dataMax']} tick={{ fill: "#666666", fontSize: 11 }} stroke="#d1d5db"
            tickFormatter={(v) => useMinutes ? `${(v / 60).toFixed(1)}min` : `${Math.round(v)}s`}
            label={{ value: useMinutes ? 'Time (minutes)' : 'Time (seconds)', position: 'insideBottom', offset: -5, fill: '#666666', fontSize: 12 }} />
          <YAxis tick={{ fill: "#666666", fontSize: 11 }} stroke="#d1d5db" label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#666666', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
            labelFormatter={(_, payload) => { const dp = payload?.[0]?.payload; return dp ? (useMinutes ? `Time: ${(dp.timeInSeconds / 60).toFixed(1)} min` : `Time: ${Math.round(dp.timeInSeconds)}s`) : '' }} />
          <Area type="monotone" dataKey="livestock" stroke="#16a34a" fill="url(#livestockGrad)" name="Livestock" />
          <Area type="monotone" dataKey="wild" stroke="#7c3aed" fill="url(#wildGrad)" name="Wild Animals" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

/* ─── Temporal Trends ─── */
const WildlifeTemporalTrends = ({ temporalTrends }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
    className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Clock className="w-5 h-5" style={{ color: '#2a2a2a' }} /> Temporal Detection Trends
    </h3>
    {temporalTrends && temporalTrends.length > 0 ? (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={temporalTrends}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis dataKey="time" tick={{ fill: "#666666", fontSize: 11 }} axisLine={{ stroke: '#d1d5db' }} />
          <YAxis tick={{ fill: "#666666", fontSize: 11 }} axisLine={{ stroke: '#d1d5db' }} />
          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }} />
          <Legend />
          <Line type="monotone" dataKey="livestock" stroke="#16a34a" strokeWidth={2} name="Livestock/min" dot={{ fill: "#16a34a", r: 3 }} />
          <Line type="monotone" dataKey="wild" stroke="#7c3aed" strokeWidth={2} name="Wild/min" dot={{ fill: "#7c3aed", r: 3 }} />
          <Line type="monotone" dataKey="pets" stroke="#ec4899" strokeWidth={2} name="Pets/min" dot={{ fill: "#ec4899", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <div className="text-center py-12 text-gray-400"><p>No temporal data available</p></div>
    )}
  </motion.div>
)

/* ─── Main Dashboard ─── */
const WildlifeDashboard = ({ data, videoUrl, isVideo }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isDetailPage = location.pathname.startsWith('/analytics/') && location.pathname !== '/analytics'

  const topClasses = Object.entries(data.confidenceAnalytics?.avgConfidenceByClass || {})
    .map(([cn, avgConf]) => ({ name: cn.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), confidence: avgConf }))
    .sort((a, b) => b.confidence - a.confidence).slice(0, 6)

  const highAlerts = data.alerts?.filter(a => a.severity === 'high') || []
  const mediumAlerts = data.alerts?.filter(a => a.severity === 'medium') || []

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#fafafa' }}>
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '64px' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`flex flex-1 flex-col overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-0'}`}>
        <main className="flex-1 p-6">
          {isDetailPage && (
            <div className="mb-6">
              <button onClick={() => navigate('/analytics')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ color: '#000000', border: '1px solid rgba(0, 0, 0, 0.12)', background: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}>
                <ArrowLeft className="w-4 h-4" /><span>Back to Analytics</span>
              </button>
            </div>
          )}
          <div className="flex flex-col gap-6">
            <WildlifePreview videoUrl={videoUrl} isVideo={isVideo} data={data} />
            <WildlifeOverview sceneOverview={data.sceneOverview} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WildlifeDensityLevels sceneDensity={data.sceneDensity} sceneOverview={data.sceneOverview} />
              <SpeciesDistribution speciesDistribution={data.speciesDistribution} />
            </div>
            <WildlifeDensityTrend sceneDensity={data.sceneDensity} />
            <WildlifeTemporalTrends temporalTrends={data.temporalTrends} />

            {/* Confidence Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  <Target className="w-5 h-5" style={{ color: '#16a34a' }} /> Detection Confidence
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: '#666666' }}>Average Confidence</p>
                    <p className="text-4xl font-bold" style={{ color: '#000000' }}>{(data.confidenceAnalytics?.avgConfidence || 0).toFixed(3)}</p>
                    <div className="mt-2 w-full rounded-full h-2" style={{ background: '#e5e7eb' }}>
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: `${(data.confidenceAnalytics?.avgConfidence || 0) * 100}%` }} />
                    </div>
                  </div>
                  {data.confidenceAnalytics?.lowConfidenceCount > 0 && (
                    <div className="rounded-lg p-3" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" style={{ color: '#ca8a04' }} />
                        <span className="text-sm font-medium" style={{ color: '#ca8a04' }}>{data.confidenceAnalytics.lowConfidenceCount} low-confidence detections</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#000000' }}>Confidence by Species</h3>
                {topClasses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topClasses}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: "#666666", fontSize: 9 }} stroke="#d1d5db" />
                      <YAxis domain={[0, 1]} tick={{ fill: "#666666", fontSize: 10 }} tickFormatter={(v) => v.toFixed(2)} stroke="#d1d5db" />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }} formatter={(v) => v.toFixed(3)} />
                      <Bar dataKey="confidence" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8" style={{ color: '#999999' }}><p>No confidence data</p></div>
                )}
              </motion.div>
            </div>

            {/* Alerts */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <Shield className="w-5 h-5" style={{ color: '#dc2626' }} /> Wildlife Alerts
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg p-4 shadow-sm" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>High Priority</p>
                  <p className="text-3xl font-bold" style={{ color: '#dc2626' }}>{highAlerts.length}</p>
                </div>
                <div className="rounded-lg p-4 shadow-sm" style={{ background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#666666' }}>Medium Priority</p>
                  <p className="text-3xl font-bold" style={{ color: '#ca8a04' }}>{mediumAlerts.length}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.alerts && data.alerts.length > 0 ? data.alerts.map((alert, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border shadow-sm ${alert.severity === 'high' ? 'bg-red-50 border-red-200' : alert.severity === 'low' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'low' ? 'text-blue-600' : 'text-yellow-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold" style={{ color: '#000000' }}>{alert.type}</h4>
                          <span className="text-xs" style={{ color: '#999999' }}>Frame {alert.frame}</span>
                        </div>
                        <p className="text-xs" style={{ color: '#666666' }}>{alert.message}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8" style={{ color: '#999999' }}>
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No alerts detected</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Performance */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <Gauge className="w-5 h-5" style={{ color: '#3b82f6' }} /> Model Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { icon: Zap, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', label: 'Avg Latency', value: `${data.performanceMetrics?.avgLatency || 0}ms`, sub: `Min: ${data.performanceMetrics?.minLatency || 0}ms | Max: ${data.performanceMetrics?.maxLatency || 0}ms` },
                  { icon: Activity, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', label: 'FPS', value: data.performanceMetrics?.fps || 0, sub: 'Frames per second' },
                  { icon: Activity, color: '#9333ea', bg: 'rgba(147, 51, 234, 0.1)', label: 'Throughput', value: data.performanceMetrics?.detectionThroughput || 0, sub: 'Detections per minute' }
                ].map((m, idx) => {
                  const Icon = m.icon
                  return (
                    <div key={idx} className="rounded-lg p-4 shadow-sm" style={{ background: '#fafafa', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded" style={{ background: m.bg }}><Icon className="w-4 h-4" style={{ color: m.color }} /></div>
                        <span className="text-xs font-medium" style={{ color: '#666666' }}>{m.label}</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: '#000000' }}>{m.value}</p>
                      <p className="text-xs mt-1" style={{ color: '#999999' }}>{m.sub}</p>
                    </div>
                  )
                })}
              </div>
              {data.performanceMetrics?.latencyTrend?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3" style={{ color: '#666666' }}>Latency Trend</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.performanceMetrics.latencyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="frame" tick={{ fill: "#666666", fontSize: 10 }} stroke="#d1d5db" />
                      <YAxis tick={{ fill: "#666666", fontSize: 10 }} axisLine={{ stroke: '#d1d5db' }} label={{ value: 'ms', position: 'insideTop', fill: '#666666' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }} />
                      <Line type="monotone" dataKey="latency" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 3 }} name="Latency (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}

export default WildlifeDashboard
