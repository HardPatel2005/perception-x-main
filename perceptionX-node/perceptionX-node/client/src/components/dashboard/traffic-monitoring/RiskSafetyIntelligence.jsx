import { motion } from 'framer-motion'
import { AlertTriangle, Shield, Ban, Users } from 'lucide-react'

const RiskSafetyIntelligence = ({ safetyAlerts, redLightViolations, jaywalking }) => {
  const highRiskAlerts = safetyAlerts?.filter(a => a.severity === 'high') || []
  const mediumRiskAlerts = safetyAlerts?.filter(a => a.severity === 'medium') || []
  
  // Handle redLightViolations - can be object with totalViolations or array
  const violationsCount = typeof redLightViolations === 'object' && redLightViolations !== null
    ? (redLightViolations.totalViolations || redLightViolations.length || 0)
    : (Array.isArray(redLightViolations) ? redLightViolations.length : 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Safety Alerts Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Risk & Safety Intelligence
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">High Risk</p>
              <p className="text-2xl font-bold text-red-400">{highRiskAlerts.length}</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Medium Risk</p>
              <p className="text-2xl font-bold text-yellow-400">{mediumRiskAlerts.length}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Total Alerts</p>
              <p className="text-2xl font-bold text-blue-400">{safetyAlerts?.length || 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-[#2a2a3a] rounded-lg">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400" />
                <span className="text-sm text-white">Red Light Violations</span>
              </div>
              <span className="text-lg font-bold text-red-400">{violationsCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#2a2a3a] rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white">Jaywalking Events</span>
              </div>
              <span className="text-lg font-bold text-yellow-400">{jaywalking?.totalJaywalking || 0}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Alerts */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-[#23233a] p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Recent Safety Alerts</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {safetyAlerts && safetyAlerts.length > 0 ? (
            safetyAlerts.slice(0, 5).map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  alert.severity === 'high'
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{alert.type}</p>
                    <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No safety alerts</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default RiskSafetyIntelligence
