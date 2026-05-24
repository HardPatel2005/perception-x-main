import { motion } from 'framer-motion'
import { Users, Car, MapPin } from 'lucide-react'

const BehavioralAnalytics = ({ jaywalking, vehicleClustering, crowdGathering }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Jaywalking Detection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-400" />
          Jaywalking Detection
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-yellow-400 mb-2">
              {jaywalking?.totalJaywalking || 0}
            </p>
            <p className="text-sm text-gray-400">Total Events</p>
          </div>
          {jaywalking?.events && jaywalking.events.length > 0 && (
            <div className="pt-4 border-t border-[#2a2a3a]">
              <p className="text-xs text-gray-400 mb-2">Recent Events</p>
              <div className="space-y-2">
                {jaywalking.events.slice(0, 3).map((event, idx) => (
                  <div key={idx} className="text-xs text-gray-300">
                    Track #{event.trackId} - {event.severity} risk
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Vehicle Clustering */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Car className="w-5 h-5 text-orange-400" />
          Vehicle Clustering
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-orange-400 mb-2">
              {vehicleClustering?.totalClusters || 0}
            </p>
            <p className="text-sm text-gray-400">Traffic Jams Detected</p>
          </div>
          <div className="pt-4 border-t border-[#2a2a3a]">
            <p className="text-sm text-gray-400 mb-1">Max Cluster Size</p>
            <p className="text-xl font-bold text-white">
              {vehicleClustering?.maxClusterSize || 0} vehicles
            </p>
          </div>
        </div>
      </motion.div>

      {/* Crowd Gathering Zones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-pink-400" />
          Crowd Gathering Zones
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-pink-400 mb-2">
              {crowdGathering?.totalZones || 0}
            </p>
            <p className="text-sm text-gray-400">Active Zones</p>
          </div>
          <div className="pt-4 border-t border-[#2a2a3a]">
            <p className="text-sm text-gray-400 mb-1">Max Crowd Size</p>
            <p className="text-xl font-bold text-white">
              {crowdGathering?.maxCrowdSize || 0} people
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default BehavioralAnalytics
