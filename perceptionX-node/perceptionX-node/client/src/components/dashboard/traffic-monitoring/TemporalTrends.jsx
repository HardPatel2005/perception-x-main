import { motion } from 'framer-motion'
import { Clock, Sun, Moon } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TemporalTrends = ({ hourlyPatterns, dayNightDensity, trafficFlowTrend }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hourly Traffic Patterns */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Hourly Traffic Patterns
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={hourlyPatterns || []}>
            <defs>
              <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c840e9" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#c840e9" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis 
              dataKey="hour" 
              tick={{ fill: "#8b8b9e", fontSize: 10 }}
              label={{ value: 'Hour', position: 'insideBottom', offset: -5, fill: '#8b8b9e' }}
            />
            <YAxis tick={{ fill: "#8b8b9e", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#23233a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Area
              type="monotone"
              dataKey="vehicles"
              stroke="#c840e9"
              fill="url(#hourlyGradient)"
              name="Vehicles"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Day vs Night Density */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-yellow-400" />
          Day vs Night Density
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Day (6 AM - 8 PM)</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{dayNightDensity?.day || 0}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Night (8 PM - 6 AM)</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{dayNightDensity?.night || 0}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-[#2a2a3a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Day Traffic Percentage</span>
              <span className="text-sm font-semibold text-white">{dayNightDensity?.dayPercentage || 0}%</span>
            </div>
            <div className="w-full bg-[#2a2a3a] rounded-full h-3">
              <div
                className="bg-gradient-to-r from-yellow-500 to-blue-500 h-3 rounded-full"
                style={{ width: `${dayNightDensity?.dayPercentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default TemporalTrends
