import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const VEHICLE_COLORS = {
  car: '#3b82f6',
  truck: '#f59e0b',
  bus: '#10b981',
  motorcycle: '#ef4444',
  bicycle: '#8b5cf6',
  train: '#06b6d4'
}

const ChartsGrid = ({ vehicleTrendData, modeDistribution, pedestrianData, infrastructureData, signalCompliance, pedestrianCrossingTimeline }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vehicle Trend Line Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl bg-[#23233a] p-5"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Vehicle Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={vehicleTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#8b8b9e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8b8b9e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#23233a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
                <Line
                  type="monotone"
                  dataKey="vehicles"
                  stroke="#c840e9"
                  strokeWidth={3}
                  name="Vehicles"
                  dot={{ fill: "#c840e9", r: 4 }}
                />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Mode Distribution Donut Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="rounded-xl bg-[#23233a] p-5"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Mode Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={modeDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {modeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(VEHICLE_COLORS)[index % Object.keys(VEHICLE_COLORS).length]} />
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
      </motion.div>

      {/* Pedestrian Crossing Timeline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        className="rounded-xl bg-[#23233a] p-5"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Pedestrian Crossing Events</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={pedestrianCrossingTimeline || pedestrianData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#8b8b9e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8b8b9e", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#23233a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="crossings"
              stroke="#ec4899"
              fill="url(#pedestrianGradient)"
              name="Crossing Events"
            >
              <defs>
                <linearGradient id="pedestrianGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Lane Density Heatmap */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
        className="rounded-xl bg-[#23233a] p-5"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Lane Density by Zone</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={infrastructureData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: "#8b8b9e", fontSize: 11 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: "#8b8b9e", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#23233a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey="count" fill="#c840e9" radius={[3, 3, 0, 0]} barSize={18}>
              <defs>
                <linearGradient id="infrastructureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                </linearGradient>
              </defs>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Signal Compliance Chart */}
      {signalCompliance && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 }}
          className="rounded-xl bg-[#23233a] p-5"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Signal Compliance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Compliant', value: signalCompliance.compliant || 0, fill: '#10b981' },
              { name: 'Violations', value: signalCompliance.violations || 0, fill: '#ef4444' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="name" tick={{ fill: "#8b8b9e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8b8b9e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#23233a',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">Compliance Rate: <span className="text-white font-semibold">{signalCompliance.complianceRate || 0}%</span></p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ChartsGrid
