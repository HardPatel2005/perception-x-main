import { motion } from 'framer-motion'
import { Gauge, Zap, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const PerformanceSection = ({ performanceMetrics }) => {
  const hasLatencyTrend = performanceMetrics?.latencyTrend?.length > 0
  const hasAnyData = performanceMetrics?.avgLatency || performanceMetrics?.fps || performanceMetrics?.detectionThroughput || hasLatencyTrend
  
  if (!hasAnyData) {
    return null
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#000' }}>
        <Gauge className="w-5 h-5" style={{ color: '#3b82f6' }} /> Processing Performance
      </h3>
      <p className="text-xs mb-4" style={{ color: '#666', fontFamily: fontSans }}>
        AI model processing metrics for this video analysis
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: hasLatencyTrend ? '1.25rem' : '0' }}>
        {[
          { icon: Zap,      color:'#eab308', bg:'rgba(234,179,8,0.1)',  label:'Avg Latency', value:`${performanceMetrics?.avgLatency??0}ms`,          sub:`Min: ${performanceMetrics?.minLatency??0}ms | Max: ${performanceMetrics?.maxLatency??0}ms` },
          { icon: Activity, color:'#16a34a', bg:'rgba(22,163,74,0.1)',  label:'FPS',         value: performanceMetrics?.fps??0,                          sub:'Frames per second' },
          { icon: Activity, color:'#9333ea', bg:'rgba(147,51,234,0.1)', label:'Throughput',  value: performanceMetrics?.detectionThroughput??0,          sub:'Detections per minute' }
        ].map((m, i) => {
          const Icon = m.icon
          return (
            <div key={i} className="rounded-lg p-4" style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded" style={{ background: m.bg }}><Icon className="w-4 h-4" style={{ color: m.color }} /></div>
                <span className="text-xs font-medium" style={{ color: '#666' }}>{m.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#000' }}>{m.value}</p>
              <p className="text-xs mt-1" style={{ color: '#999' }}>{m.sub}</p>
            </div>
          )
        })}
      </div>
      {hasLatencyTrend && (
        <>
          <h4 className="text-sm font-medium mb-3" style={{ color: '#666' }}>Processing Latency Over Time</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={performanceMetrics.latencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="frame" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
              <Tooltip contentStyle={ttStyle} />
              <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 2 }} name="Latency (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </motion.div>
  )
}

export default PerformanceSection
