import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const TrafficFlowIntelligence = ({ trafficFlowRate, directionalFlow, laneUtilization }) => {
  const flowData = [
    { name: 'Left', value: directionalFlow?.left || 0, color: '#ef4444' },
    { name: 'Right', value: directionalFlow?.right || 0, color: '#10b981' },
    { name: 'Up', value: directionalFlow?.up || 0, color: '#3b82f6' },
    { name: 'Down', value: directionalFlow?.down || 0, color: '#f59e0b' },
    { name: 'Stationary', value: directionalFlow?.stationary || 0, color: '#6b7280' }
  ]

  const laneData = [
    { name: 'Entry', value: laneUtilization?.entryCount || 0 },
    { name: 'Exit', value: laneUtilization?.exitCount || 0 }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Flow Rate Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#c840e9]" />
          Traffic Flow Rate
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Vehicles per Minute</p>
            <p className="text-3xl font-bold text-white">{trafficFlowRate?.vehiclesPerMinute || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Vehicles per Hour</p>
            <p className="text-2xl font-bold text-[#c840e9]">{trafficFlowRate?.vehiclesPerHour || 0}</p>
          </div>
        </div>
      </motion.div>

      {/* Directional Flow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Directional Flow</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={flowData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {flowData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#23233a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-red-400" />
            <span className="text-gray-400">Left: {directionalFlow?.left || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-green-400" />
            <span className="text-gray-400">Right: {directionalFlow?.right || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400">Up: {directionalFlow?.up || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400">Down: {directionalFlow?.down || 0}</span>
          </div>
        </div>
      </motion.div>

      {/* Lane Utilization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Lane Utilization</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={laneData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis dataKey="name" tick={{ fill: "#8b8b9e", fontSize: 12 }} />
            <YAxis tick={{ fill: "#8b8b9e", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#23233a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey="value" fill="#c840e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">Total Traffic: {laneUtilization?.total || 0}</p>
        </div>
      </motion.div>
    </div>
  )
}

export default TrafficFlowIntelligence
