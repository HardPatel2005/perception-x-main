import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const RestaurantDensityTrend = ({ sceneDensity }) => {
  const frames = sceneDensity?.frames || []
  const totalFrames = sceneDensity?.totalFrames || 0
  const videoDuration = sceneDensity?.videoDurationSeconds || totalFrames / 30
  const useMinutes = videoDuration >= 120

  const chartData = frames.map((f, idx) => {
    const frameNum = f.frame !== undefined ? f.frame : idx
    const prog = totalFrames > 1 ? frameNum / (totalFrames - 1) : 0
    const t = prog * videoDuration
    return {
      time: t, timeInSeconds: t,
      food: f.food || 0, utensils: f.utensils || 0, appliances: f.appliances || 0,
      chairs: f.chairs || 0, tables: f.tables || 0, persons: f.persons || 0
    }
  })

  const hasFood      = chartData.some(d => d.food > 0)
  const hasUtensils  = chartData.some(d => d.utensils > 0)
  const hasAppliances= chartData.some(d => d.appliances > 0)
  const hasChairs    = chartData.some(d => d.chairs > 0)
  const hasTables    = chartData.some(d => d.tables > 0)
  const hasPersons   = chartData.some(d => d.persons > 0)

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <TrendingUp className="w-5 h-5" style={{ color: '#f59e0b' }} /> Detection Density Over Time
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            {[['foodG','#ef4444'],['utensilG','#3b82f6'],['appG','#8b5cf6'],['chairG','#a16207'],['tableG','#92400e'],['personG','#f59e0b']].map(([id,c]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c} stopOpacity={0.5} />
                <stop offset="95%" stopColor={c} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin','dataMax']}
            tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db"
            tickFormatter={v => useMinutes ? `${(v/60).toFixed(1)}m` : `${Math.round(v)}s`}
            label={{ value: useMinutes ? 'Time (min)' : 'Time (s)', position: 'insideBottom', offset: -4, fill: '#666', fontSize: 11 }} />
          <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db"
            label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }} />
          <Tooltip contentStyle={ttStyle}
            labelFormatter={(_, pl) => { const d = pl?.[0]?.payload; return d ? (useMinutes ? `Time: ${(d.timeInSeconds/60).toFixed(1)}m` : `Time: ${Math.round(d.timeInSeconds)}s`) : '' }} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {hasChairs   && <Area type="monotone" dataKey="chairs"    stroke="#a16207" fill="url(#chairG)"   name="Chairs"     dot={false} />}
          {hasTables   && <Area type="monotone" dataKey="tables"    stroke="#92400e" fill="url(#tableG)"   name="Tables"     dot={false} />}
          {hasFood     && <Area type="monotone" dataKey="food"      stroke="#ef4444" fill="url(#foodG)"    name="Food"       dot={false} />}
          {hasUtensils && <Area type="monotone" dataKey="utensils"  stroke="#3b82f6" fill="url(#utensilG)" name="Utensils"   dot={false} />}
          {hasAppliances&&<Area type="monotone" dataKey="appliances"stroke="#8b5cf6" fill="url(#appG)"    name="Appliances" dot={false} />}
          {hasPersons  && <Area type="monotone" dataKey="persons"   stroke="#f59e0b" fill="url(#personG)"  name="Persons"    dot={false} />}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export default RestaurantDensityTrend
