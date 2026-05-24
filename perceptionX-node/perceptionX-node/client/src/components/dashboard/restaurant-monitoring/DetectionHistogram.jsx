import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const DetectionHistogram = ({ inferenceHistogram }) => {
  const isItemDist = inferenceHistogram?.some(b => b.isItemDist)
  const hasData    = inferenceHistogram?.some(b => b.count > 0)
  const title   = isItemDist ? 'Items per Frame Distribution' : 'Inference Time Distribution'
  const xLabel  = isItemDist ? 'Items' : 'ms'
  const barColors = isItemDist
    ? ['#d1d5db','#86efac','#22c55e','#f59e0b','#ef4444']
    : ['#22c55e','#86efac','#f59e0b','#f97316','#ef4444']

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={`${card} flex flex-col`} style={cardStyle}>
      <h3 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <Zap className="w-4 h-4" style={{ color: '#8b5cf6' }} /> {title}
      </h3>
      {isItemDist && <p className="text-xs mb-3" style={{ color: '#999' }}>Distribution of total detected items per sampled frame</p>}
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={inferenceHistogram}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis dataKey="bin" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db"
              label={{ value: 'Frames', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }} />
            <Tooltip contentStyle={ttStyle} formatter={v => [v, 'Frames']} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {inferenceHistogram.map((_, i) => <Cell key={i} fill={barColors[i] || '#8b5cf6'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <div className="text-center py-10 text-gray-400 text-sm">No distribution data available</div>}
    </motion.div>
  )
}

export default DetectionHistogram
