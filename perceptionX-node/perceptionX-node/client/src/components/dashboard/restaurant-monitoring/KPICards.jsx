import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileVideo, Activity, BarChart2, Users } from 'lucide-react'
import { card, cardStyle, fontSans } from './constants'

const KPICards = ({ sceneOverview, occupancyData, anomalyTimeline, sceneDensity }) => {
  const totalFrames      = sceneOverview?.totalFrames ?? 0
  const framesWithItems  = sceneOverview?.framesWithItems ?? 0
  const itemDiversity    = sceneOverview?.itemDiversity ?? 0
  const detectionFrequency = sceneOverview?.itemDetectionFrequency ?? 0
  const mostCommonItem = sceneOverview?.mostCommonItem || 'N/A'
  const mostCommonItemPct = parseFloat(sceneOverview?.mostCommonItemPercentage || 0)
  const kitchenActivityScore = sceneOverview?.kitchenActivityScore ?? 0

  // ── Card 3: Seat Occupancy Rate ──
  const occupancyMetrics = useMemo(() => {
    const avgOccupancy = sceneOverview?.avgSeatFillRate ?? 0
    const peakPersons = sceneOverview?.peakPersons ?? 0
    const avgPersons = sceneOverview?.avgPersonsPerFrame ?? 0
    
    let avgChairs = 0
    if (occupancyData && occupancyData.length > 0) {
      const totalChairs = occupancyData.reduce((s, d) => s + (d.chairs || 0), 0)
      avgChairs = totalChairs > 0 ? Math.round((totalChairs / occupancyData.length) * 10) / 10 : 0
    }
    if (avgChairs === 0 && sceneDensity?.frames && sceneDensity.frames.length > 0) {
      const totalChairs = sceneDensity.frames.reduce((s, f) => s + (f.chairs || 0), 0)
      avgChairs = totalChairs > 0 ? Math.round((totalChairs / sceneDensity.frames.length) * 10) / 10 : 0
    }
    
    let peakOccupancy = 0
    if (occupancyData && occupancyData.length > 0) {
      const validRates = occupancyData
        .filter(d => d.seatFillRate !== undefined && !isNaN(d.seatFillRate))
        .map(d => d.seatFillRate)
      peakOccupancy = validRates.length > 0 ? Math.max(...validRates) : avgOccupancy
    } else if (peakPersons > 0 && avgChairs > 0) {
      peakOccupancy = Math.min(Math.round((peakPersons / avgChairs) * 100), 200)
    } else {
      peakOccupancy = avgOccupancy
    }
    
    let status = 'Empty'
    if (avgOccupancy >= 80) status = 'Overcrowded'
    else if (avgOccupancy >= 60) status = 'Busy'
    else if (avgOccupancy >= 30) status = 'Moderate'
    else if (avgChairs > 0) status = 'Empty'
    
    return { avgOccupancy, peakOccupancy, avgPersons, avgChairs, status }
  }, [sceneOverview, occupancyData, sceneDensity])

  // ── Card 4: Average Items per Frame (Kitchen Activity) ──
  const activityMetrics = useMemo(() => {
    const avgItemsPerFrame = sceneOverview?.avgItemsPerFrame ?? 0
    const peakItems = sceneOverview?.peakItems ?? 0
    const totalItems = sceneOverview?.totalItems ?? 0
    const itemDetectionFrequency = sceneOverview?.itemDetectionFrequency ?? 0
    
    // Recalculate activity level with more conservative thresholds
    let kitchenActivityLevel = 'Very Low'
    if (avgItemsPerFrame >= 8 && itemDetectionFrequency >= 70) {
      kitchenActivityLevel = 'Very High'
    } else if (avgItemsPerFrame >= 6 && itemDetectionFrequency >= 60) {
      kitchenActivityLevel = 'High'
    } else if (avgItemsPerFrame >= 4 && itemDetectionFrequency >= 50) {
      kitchenActivityLevel = 'Moderate'
    } else if (avgItemsPerFrame >= 1.5 || (avgItemsPerFrame >= 2 && itemDetectionFrequency >= 30)) {
      kitchenActivityLevel = 'Low'
    }
    
    const activityColors = {
      'Very Low': '#9ca3af',
      'Low': '#22c55e',
      'Moderate': '#f59e0b',
      'High': '#f97316',
      'Very High': '#ef4444'
    }
    
    return { 
      avgItemsPerFrame: avgItemsPerFrame.toFixed(1),
      peakItems,
      totalItems,
      activityLevel: kitchenActivityLevel,
      color: activityColors[kitchenActivityLevel] || '#9ca3af'
    }
  }, [sceneOverview])

  const statusColors = {
    Empty: '#9ca3af',
    Moderate: '#22c55e',
    Busy: '#f59e0b',
    Overcrowded: '#ef4444'
  }

  const cards = [
    {
      label: 'Total Frames',
      value: totalFrames,
      sub: `${framesWithItems} frames had detections`,
      icon: FileVideo,
      color: '#3b82f6',
      showProgress: true,
      progressValue: detectionFrequency,
      progressLabel: 'Detection Rate'
    },
    {
      label: 'Item Diversity',
      value: itemDiversity,
      sub: `Unique item classes recognised`,
      icon: BarChart2,
      color: '#8b5cf6',
      showItemInfo: true,
      mostCommonItem: mostCommonItem,
      mostCommonItemPct: mostCommonItemPct
    },
    {
      label: 'Seat Occupancy Rate',
      value: `${occupancyMetrics.avgOccupancy}%`,
      sub: occupancyMetrics.avgChairs > 0
        ? `${occupancyMetrics.avgPersons.toFixed(1)} of ${occupancyMetrics.avgChairs} seats filled on avg · Peak: ${occupancyMetrics.peakOccupancy}%`
        : occupancyMetrics.avgPersons > 0
        ? `${occupancyMetrics.avgPersons.toFixed(1)} persons detected on avg · Peak: ${occupancyMetrics.peakOccupancy}%`
        : `No occupancy data · Peak: ${occupancyMetrics.peakOccupancy}%`,
      icon: Users,
      color: statusColors[occupancyMetrics.status] || '#9ca3af',
      badge: occupancyMetrics.status,
      showGauge: true,
      gaugeValue: occupancyMetrics.avgOccupancy
    },
    {
      label: 'Avg Items per Frame',
      value: activityMetrics.avgItemsPerFrame,
      sub: `Peak: ${activityMetrics.peakItems} items · Total: ${activityMetrics.totalItems} detections`,
      icon: Activity,
      color: activityMetrics.color,
      badge: activityMetrics.activityLevel,
      showActivityScore: true,
      activityScore: kitchenActivityScore
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={card} style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
            {/* Header: Icon and Label/Badge */}
            <div className="flex items-start justify-between mb-5">
              <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: `${c.color}12` }}>
                <Icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ background: `${c.color}12`, color: c.color }}>
                    {c.badge}
                  </span>
                )}
                <span className="text-xs font-medium" style={{ color: '#9ca3af', fontFamily: fontSans }}>
                  {c.label}
                </span>
              </div>
            </div>
            
            {/* Gauge for Seat Occupancy */}
            {c.showGauge && (
              <div className="mb-5 relative flex-shrink-0 flex items-center justify-center" style={{ width: '100%', height: 72 }}>
                <svg viewBox="0 0 64 64" className="transform -rotate-90" style={{ width: 72, height: 72 }}>
                  <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke={c.color}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(c.gaugeValue / 100) * 175.9} 175.9`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.3s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: c.color }}>
                    {c.gaugeValue}%
                  </span>
                </div>
              </div>
            )}

            {/* Progress Bar for Total Frames */}
            {c.showProgress && (
              <div className="mb-5 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{c.progressLabel}</span>
                  <span className="text-xs font-bold" style={{ color: c.color }}>{c.progressValue}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: '#e5e7eb' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${c.progressValue}%`, 
                      background: c.color 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Item Info for Item Diversity */}
            {c.showItemInfo && (
              <div className="mb-5 flex-shrink-0">
                <div className="rounded-lg p-3" style={{ background: `${c.color}08`, border: `1px solid ${c.color}20` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Most Common</span>
                    <span className="text-xs font-bold" style={{ color: c.color }}>{c.mostCommonItemPct}%</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>{c.mostCommonItem}</p>
                </div>
              </div>
            )}

            {/* Activity Score for Avg Items per Frame */}
            {c.showActivityScore && (
              <div className="mb-5 relative flex-shrink-0 flex items-center justify-center" style={{ width: '100%', height: 72 }}>
                <svg viewBox="0 0 64 64" className="transform -rotate-90" style={{ width: 72, height: 72 }}>
                  <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke={c.color}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(c.activityScore / 100) * 175.9} 175.9`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.3s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: c.color }}>
                    {c.activityScore}
                  </span>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Score</span>
                </div>
              </div>
            )}

            {/* Main Value */}
            <div className={c.showGauge ? 'mb-3' : 'mb-4'}>
              <p className={`font-bold leading-none ${c.showGauge ? 'text-2xl' : 'text-3xl'}`} 
                 style={{ color: '#111827', fontFamily: fontSans }}>
                {c.value}
              </p>
            </div>

            {/* Description/Sub-text */}
            <div className="mt-auto">
              <p className="text-xs leading-relaxed" style={{ color: '#6b7280', fontFamily: fontSans, lineHeight: '1.5' }}>
                {c.sub}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default KPICards
