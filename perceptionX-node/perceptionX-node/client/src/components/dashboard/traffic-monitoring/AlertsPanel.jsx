import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

const AlertsPanel = ({ alerts }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.0 }}
      className="rounded-xl bg-[#23233a] p-5"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Alerts Timeline</h3>
      <div className="space-y-4">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`relative pl-6 pb-4 border-l-2 ${
                alert.severity === 'high' ? 'border-red-500/50' : 'border-yellow-500/50'
              }`}
            >
              <div className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
                alert.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <div className={`p-4 rounded-xl ${
                alert.severity === 'high'
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-yellow-500/10 border border-yellow-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium text-sm">{alert.type}</h4>
                      <span className="text-xs text-gray-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-400">{alert.message}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No alerts at this time</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AlertsPanel
