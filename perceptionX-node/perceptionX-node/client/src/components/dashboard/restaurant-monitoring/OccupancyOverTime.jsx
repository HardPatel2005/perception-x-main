import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, Armchair } from 'lucide-react'
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const OccupancyOverTime = ({ occupancyData, sceneOverview, hasPersonData, onChartClick }) => {
  const dataKey  = hasPersonData ? 'persons' : 'chairs'
  const title    = hasPersonData ? 'Occupancy Over Time' : 'Chair Count Over Time'
  const yLabel   = hasPersonData ? 'Persons' : 'Chairs'
  const lineColor = hasPersonData ? '#f59e0b' : '#a16207'

  // Calculate video duration and determine time format
  const videoDuration = useMemo(() => {
    if (!occupancyData?.length) return 0
    const totalFrames = sceneOverview?.totalFrames || Math.max(...occupancyData.map(d => d.frame || 0))
    const fps = sceneOverview?.fps || 30 // Default to 30 fps if not provided
    return totalFrames / fps
  }, [occupancyData, sceneOverview])

  const useMinutes = videoDuration >= 3600 // Show minutes if video is 1 hour or longer

  // Transform data to include time in seconds
  const chartData = useMemo(() => {
    if (!occupancyData?.length) return []
    const fps = sceneOverview?.fps || 30
    const totalFrames = sceneOverview?.totalFrames || Math.max(...occupancyData.map(d => d.frame || 0))
    
    return occupancyData.map(d => {
      const frameNum = d.frame || 0
      const timeInSeconds = frameNum / fps
      return {
        ...d,
        time: timeInSeconds,
        timeInSeconds: timeInSeconds
      }
    })
  }, [occupancyData, sceneOverview])

  const avg  = hasPersonData
    ? (sceneOverview?.avgPersonsPerFrame ?? 0)
    : (occupancyData?.length > 0 ? Math.round(occupancyData.reduce((s, d) => s + d.chairs, 0) / occupancyData.length * 10) / 10 : 0)
  const peak = hasPersonData
    ? (sceneOverview?.peakPersons ?? 0)
    : (occupancyData?.length > 0 ? Math.max(...occupancyData.map(d => d.chairs)) : 0)

  const hasData = occupancyData?.some(d => d[dataKey] > 0) ?? false

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        {hasPersonData ? <Users className="w-5 h-5" style={{ color: '#f59e0b' }} /> : <Armchair className="w-5 h-5" style={{ color: '#a16207' }} />}
        {title}
      </h3>
      {!hasPersonData && <p className="text-xs mb-3" style={{ color: '#999' }}>Person detections not available for this batch — showing chair count as occupancy proxy</p>}
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart 
            data={chartData}
            onClick={(e) => {
              if (e && onChartClick) {
                // Try to get time from active payload first (most accurate)
                if (e.activePayload && e.activePayload.length > 0) {
                  const payload = e.activePayload[0].payload
                  const time = payload.timeInSeconds || payload.time || 0
                  if (time > 0) {
                    onChartClick(time)
                    return
                  }
                }
                
                // Fallback: calculate time from x coordinate
                if (e.activeCoordinate) {
                  const { x } = e.activeCoordinate
                  const chartContainer = e.currentTarget?.closest('.recharts-wrapper')
                  const actualWidth = chartContainer?.clientWidth || 800
                  
                  // Calculate time from x coordinate
                  const minTime = Math.min(...chartData.map(d => d.time))
                  const maxTime = Math.max(...chartData.map(d => d.time))
                  const timeRange = maxTime - minTime
                  
                  if (timeRange > 0) {
                    // Calculate clicked time based on x position
                    const clickRatio = Math.max(0, Math.min(1, x / actualWidth))
                    const clickedTime = minTime + (timeRange * clickRatio)
                    
                    // Call the callback to seek video
                    onChartClick(Math.max(0, clickedTime))
                  }
                }
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="time" 
              type="number" 
              scale="linear" 
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#666', fontSize: 10 }} 
              stroke="#d1d5db"
              tickFormatter={v => useMinutes ? `${(v/60).toFixed(1)}m` : `${Math.round(v)}s`}
              label={{ value: useMinutes ? 'Time (min)' : 'Time (s)', position: 'insideBottom', offset: -4, fill: '#666', fontSize: 11 }} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db"
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }} />
            <Tooltip 
              contentStyle={ttStyle} 
              formatter={(v, n) => [v, yLabel]}
              labelFormatter={(_, pl) => {
                const d = pl?.[0]?.payload
                if (!d) return ''
                const time = d.timeInSeconds || d.time || 0
                return useMinutes ? `Time: ${(time/60).toFixed(1)}m` : `Time: ${Math.round(time)}s`
              }} />
            {avg > 0 && <ReferenceLine y={avg}  stroke="#3b82f6" strokeDasharray="4 3"
              label={{ value: `Avg ${avg}`, position: 'right', fill: '#3b82f6', fontSize: 10 }} />}
            {peak > 0 && <ReferenceLine y={peak} stroke="#ef4444" strokeDasharray="4 3"
              label={{ value: `Peak ${peak}`, position: 'right', fill: '#ef4444', fontSize: 10 }} />}
            <Area type="monotone" dataKey={dataKey} stroke={lineColor} strokeWidth={2} fill="url(#occGrad)" dot={false} name={yLabel} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : <div className="text-center py-14 text-gray-400 text-sm">No {yLabel.toLowerCase()} detections in this recording</div>}
    </motion.div>
  )
}

export default OccupancyOverTime
