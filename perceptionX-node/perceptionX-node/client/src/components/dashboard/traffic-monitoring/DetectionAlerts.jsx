import { motion } from 'framer-motion'
import { AlertTriangle, Shield } from 'lucide-react'

const DetectionAlerts = ({ alerts }) => {
  const highAlerts = alerts?.filter(a => a.severity === 'high') || []
  const mediumAlerts = alerts?.filter(a => a.severity === 'medium') || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-6 shadow-sm"
      style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Shield className="w-5 h-5" style={{ color: '#dc2626' }} />
        Detection-Based Traffic Alerts
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg p-4 shadow-sm" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>High Priority</p>
          <p className="text-3xl font-bold" style={{ color: '#dc2626', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{highAlerts.length}</p>
        </div>
        <div className="rounded-lg p-4 shadow-sm" style={{ background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Medium Priority</p>
          <p className="text-3xl font-bold" style={{ color: '#ca8a04', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{mediumAlerts.length}</p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border shadow-sm ${
                alert.severity === 'high'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{alert.type}</h4>
                    <span className="text-xs" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Frame {alert.frame}</span>
                  </div>
                  <p className="text-xs" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{alert.message}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8" style={{ color: '#999999' }}>
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No alerts detected</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default DetectionAlerts
