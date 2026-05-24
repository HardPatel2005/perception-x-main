import { motion } from 'framer-motion'
import { TrafficCone, StopCircle, ParkingCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const InfrastructureMonitoring = ({ infrastructureInteraction }) => {
  const infraData = [
    {
      name: 'Traffic Lights',
      detected: infrastructureInteraction?.trafficLights?.detected || 0,
      interactions: infrastructureInteraction?.trafficLights?.interactions || 0
    },
    {
      name: 'Stop Signs',
      detected: infrastructureInteraction?.stopSigns?.detected || 0,
      interactions: infrastructureInteraction?.stopSigns?.interactions || 0
    },
    {
      name: 'Parking Meters',
      detected: infrastructureInteraction?.parkingMeters?.detected || 0,
      interactions: infrastructureInteraction?.parkingMeters?.interactions || 0
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-[#23233a] p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Infrastructure Monitoring</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#2a2a3a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrafficCone className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Traffic Lights</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {infrastructureInteraction?.trafficLights?.detected || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {infrastructureInteraction?.trafficLights?.interactions || 0} interactions
          </p>
        </div>

        <div className="bg-[#2a2a3a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <StopCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Stop Signs</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {infrastructureInteraction?.stopSigns?.detected || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {infrastructureInteraction?.stopSigns?.interactions || 0} interactions
          </p>
        </div>

        <div className="bg-[#2a2a3a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ParkingCircle className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Parking Meters</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {infrastructureInteraction?.parkingMeters?.detected || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {infrastructureInteraction?.parkingMeters?.interactions || 0} interactions
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={infraData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
          <XAxis dataKey="name" tick={{ fill: "#8b8b9e", fontSize: 11 }} />
          <YAxis tick={{ fill: "#8b8b9e", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#23233a',
              border: '1px solid #2a2a3a',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Bar dataKey="detected" fill="#c840e9" radius={[4, 4, 0, 0]} name="Detected" />
          <Bar dataKey="interactions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Interactions" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export default InfrastructureMonitoring
