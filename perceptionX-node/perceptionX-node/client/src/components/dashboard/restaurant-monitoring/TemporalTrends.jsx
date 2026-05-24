import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const TemporalTrends = ({ temporalTrends }) => {
  const hasAnyData = temporalTrends?.some(t => t.food > 0 || t.utensils > 0 || t.appliances > 0)
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <Clock className="w-5 h-5" style={{ color: '#2a2a2a' }} /> Temporal Detection Trends
      </h3>
      {hasAnyData ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={temporalTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <Tooltip contentStyle={ttStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="food"      stroke="#ef4444" strokeWidth={2} name="Food/min"      dot={{ fill: '#ef4444', r: 3 }} />
            <Line type="monotone" dataKey="utensils"  stroke="#3b82f6" strokeWidth={2} name="Utensils/min"  dot={{ fill: '#3b82f6', r: 3 }} />
            <Line type="monotone" dataKey="appliances"stroke="#8b5cf6" strokeWidth={2} name="Appliances/min"dot={{ fill: '#8b5cf6', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-10 text-gray-400 text-sm">
          No food/utensil/appliance detections in this recording — scene contains primarily furniture
        </div>
      )}
    </motion.div>
  )
}

export default TemporalTrends
