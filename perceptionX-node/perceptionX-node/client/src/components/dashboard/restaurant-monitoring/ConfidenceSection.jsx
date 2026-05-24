import { motion } from 'framer-motion'
import { Target, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { card, cardStyle, ttStyle } from './constants'

const ConfidenceSection = ({ confidenceAnalytics }) => {
  const topClasses = Object.entries(confidenceAnalytics?.avgConfidenceByClass || {})
    .map(([cn, v]) => ({ name: cn.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), confidence: v }))
    .sort((a, b) => b.confidence - a.confidence).slice(0, 6)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className={card} style={cardStyle}>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#000' }}>
          <Target className="w-5 h-5" style={{ color: '#f59e0b' }} /> Detection Confidence
        </h3>
        <p className="text-sm font-medium mb-1" style={{ color: '#666' }}>Average Confidence</p>
        <p className="text-4xl font-bold mb-3" style={{ color: '#000' }}>{(confidenceAnalytics?.avgConfidence || 0).toFixed(3)}</p>
        <div className="w-full rounded-full h-2" style={{ background: '#e5e7eb' }}>
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
            style={{ width: `${(confidenceAnalytics?.avgConfidence || 0) * 100}%` }} />
        </div>
        {(confidenceAnalytics?.lowConfidenceCount || 0) > 0 && (
          <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" style={{ color: '#ca8a04' }} />
              <span className="text-sm font-medium" style={{ color: '#ca8a04' }}>{confidenceAnalytics.lowConfidenceCount} low-confidence detections</span>
            </div>
          </div>
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
        className={card} style={cardStyle}>
        <h3 className="text-base font-semibold mb-4" style={{ color: '#000' }}>Confidence by Item</h3>
        {topClasses.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topClasses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 9 }} stroke="#d1d5db" />
              <YAxis domain={[0, 1]} tick={{ fill: '#666', fontSize: 10 }} tickFormatter={v => v.toFixed(2)} stroke="#d1d5db" />
              <Tooltip contentStyle={ttStyle} formatter={v => v.toFixed(3)} />
              <Bar dataKey="confidence" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="text-center py-10 text-gray-400 text-sm">No confidence data</div>}
      </motion.div>
    </div>
  )
}

export default ConfidenceSection
