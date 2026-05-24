import { motion } from 'framer-motion'
import { Shield, AlertTriangle } from 'lucide-react'
import { card, cardStyle, fontSans } from './constants'

const AlertsPanel = ({ alerts }) => {
  const high   = (alerts || []).filter(a => a.severity === 'high').length
  const medium = (alerts || []).filter(a => a.severity === 'medium').length
  const low    = (alerts || []).filter(a => a.severity === 'low').length
  const ss = s => s === 'high'
    ? { bg:'rgba(239,68,68,0.07)',   border:'rgba(239,68,68,0.2)',   icon:'#dc2626', badge:'bg-red-100 text-red-700' }
    : s === 'medium'
    ? { bg:'rgba(234,179,8,0.07)',   border:'rgba(234,179,8,0.2)',   icon:'#ca8a04', badge:'bg-yellow-100 text-yellow-700' }
    : { bg:'rgba(59,130,246,0.07)',  border:'rgba(59,130,246,0.2)',  icon:'#2563eb', badge:'bg-blue-100 text-blue-700' }
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <Shield className="w-5 h-5" style={{ color: '#dc2626' }} /> Kitchen Alerts
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['High', high, '#dc2626','rgba(239,68,68,0.05)','rgba(239,68,68,0.2)'],
          ['Medium', medium, '#ca8a04','rgba(234,179,8,0.05)','rgba(234,179,8,0.2)'],
          ['Low', low, '#2563eb','rgba(59,130,246,0.05)','rgba(59,130,246,0.2)']].map(([l,n,c,bg,border]) => (
          <div key={l} className="rounded-lg p-3" style={{ background: bg, border: `1px solid ${border}` }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#666' }}>{l}</p>
            <p className="text-2xl font-bold" style={{ color: c }}>{n}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {alerts?.length > 0 ? alerts.map((alert, i) => {
          const s = ss(alert.severity)
          return (
            <div key={i} className="p-3 rounded-lg border" style={{ background: s.bg, borderColor: s.border }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.icon }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: '#000' }}>{alert.type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.badge}`}>{alert.severity}</span>
                  </div>
                  <p className="text-xs" style={{ color: '#555' }}>{alert.message}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#999' }}>Frame {alert.frame}</p>
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="text-center py-8" style={{ color: '#999' }}>
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No alerts for this recording</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AlertsPanel
