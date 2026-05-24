import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TemporalDetectionTrends = ({ temporalTrends }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-6 shadow-sm"
      style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Clock className="w-5 h-5" style={{ color: '#2a2a2a' }} />
        Temporal Detection Trends
      </h3>
      {temporalTrends && temporalTrends.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={temporalTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="time" 
              tick={{ fill: "#666666", fontSize: 11 }} 
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fill: "#666666", fontSize: 11 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: '8px',
                color: '#000000',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="vehicles"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Vehicles/min"
              dot={{ fill: "#3b82f6", r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="pedestrians"
              stroke="#ec4899"
              strokeWidth={2}
              name="Pedestrians/min"
              dot={{ fill: "#ec4899", r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="signals"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Signals/min"
              dot={{ fill: "#f59e0b", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>No temporal data available</p>
        </div>
      )}
    </motion.div>
  )
}

export default TemporalDetectionTrends
