import { motion } from 'framer-motion'
import { Car, Users, FileText } from 'lucide-react'

const SceneOverview = ({ sceneOverview }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <FileText className="w-5 h-5" style={{ color: '#3b82f6' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Avg Objects/Frame</span>
        </div>
        <p className="text-3xl font-bold mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {sceneOverview?.avgObjectsPerFrame?.toFixed(1) || '0.0'}
        </p>
        <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {sceneOverview?.totalFrames || 0} frames analyzed
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(22, 163, 74, 0.1)' }}>
            <Car className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Vehicles</span>
        </div>
        <p className="text-3xl font-bold mb-1" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {sceneOverview?.mostCommonVehicleType || 'N/A'}
        </p>
        <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Most Common Vehicle
        </p>
        <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {sceneOverview?.mostCommonVehiclePercentage || 0}% of detections
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>
            <Users className="w-5 h-5" style={{ color: '#ec4899' }} />
          </div>
          <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Pedestrians</span>
        </div>
        <p className={`text-3xl font-bold mb-1 ${
          sceneOverview?.pedestrianActivityLevel === 'Very High' ? 'text-red-600' :
          sceneOverview?.pedestrianActivityLevel === 'High' ? 'text-red-500' :
          sceneOverview?.pedestrianActivityLevel === 'Moderate' ? 'text-yellow-500' :
          sceneOverview?.pedestrianActivityLevel === 'Low' ? 'text-green-500' :
          'text-green-600'
        }`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          {sceneOverview?.pedestrianActivityLevel || 'Very Low'}
        </p>
        <p className="text-sm" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Activity Level
        </p>
        <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          Score: {sceneOverview?.pedestrianActivityScore || 0}/100
        </p>
      </motion.div>
    </div>
  )
}

export default SceneOverview
