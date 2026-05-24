import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const SeatFillRate = ({ occupancyData, hasPersonData }) => {
  const chartData = useMemo(() => {
    if (!occupancyData?.length) return []
    if (hasPersonData) return occupancyData
    return occupancyData.map(d => ({
      ...d,
      chairsPerTable: d.tables > 0 ? Math.round((d.chairs / d.tables) * 10) / 10 : d.chairs
    }))
  }, [occupancyData, hasPersonData])

  const title    = hasPersonData ? 'Seat Fill Rate %' : 'Chairs per Dining Table'
  const dataKey  = hasPersonData ? 'seatFillRate' : 'chairsPerTable'
  const yTickFmt = hasPersonData ? v => `${v}%` : v => v
  const hasMeaningfulData = chartData.some(d => d[dataKey] > 0)

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-2 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <Target className="w-5 h-5" style={{ color: '#16a34a' }} /> {title}
      </h3>
      {!hasPersonData && (
        <p className="text-xs mb-3" style={{ color: '#999' }}>
          Shows how many chairs are detected per dining table — typical restaurant setup: 4–8 chairs/table
        </p>
      )}
      {hasPersonData && (
        <div className="flex gap-3 mb-3 flex-wrap">
          {[['<30%', 'Underfull', '#ef4444'], ['30–70%', 'Moderate', '#f59e0b'], ['>70%', 'Busy / Full', '#22c55e']].map(([r, l, c]) => (
            <div key={r} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: c, opacity: 0.6 }} />
              <span className="text-xs" style={{ color: '#666' }}>{r} — {l}</span>
            </div>
          ))}
        </div>
      )}
      {hasMeaningfulData ? (
        <ResponsiveContainer width="100%" height={hasPersonData ? 210 : 230}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            {hasPersonData && <>
              <ReferenceArea y1={0}  y2={30}  fill="rgba(239,68,68,0.07)"  ifOverflow="extendDomain" />
              <ReferenceArea y1={30} y2={70}  fill="rgba(234,179,8,0.07)"  ifOverflow="extendDomain" />
              <ReferenceArea y1={70} y2={210} fill="rgba(34,197,94,0.07)"  ifOverflow="extendDomain" />
              <ReferenceLine y={80} stroke="#16a34a" strokeDasharray="4 3"
                label={{ value: '80% target', position: 'insideTopRight', fill: '#16a34a', fontSize: 10 }} />
            </>}
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
            <XAxis dataKey="frame" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" tickFormatter={yTickFmt} />
            <Tooltip contentStyle={ttStyle}
              formatter={v => [hasPersonData ? `${v}%` : v, hasPersonData ? 'Fill Rate' : 'Chairs / Table']} />
            <Area type="monotone" dataKey={dataKey} stroke="#16a34a" strokeWidth={2} fill="url(#fillGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : <div className="text-center py-12 text-gray-400 text-sm">No {hasPersonData ? 'seating' : 'table'} data available</div>}
    </motion.div>
  )
}

export default SeatFillRate
