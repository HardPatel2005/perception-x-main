import { motion } from 'framer-motion'
import { Target, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ConfidenceAnalytics = ({ confidenceAnalytics }) => {
  const topClasses = Object.entries(confidenceAnalytics?.avgConfidenceByClass || {})
    .map(([className, avgConf]) => ({
      name: className.charAt(0).toUpperCase() + className.slice(1),
      confidence: avgConf
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Confidence Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <Target className="w-5 h-5" style={{ color: '#16a34a' }} />
          Detection Confidence
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Average Confidence</p>
            <p className="text-4xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {(confidenceAnalytics?.avgConfidence || 0).toFixed(3)}
            </p>
            <div className="mt-2 w-full rounded-full h-2" style={{ background: '#e5e7eb' }}>
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                style={{ width: `${(confidenceAnalytics?.avgConfidence || 0) * 100}%` }}
              />
            </div>
          </div>

          {confidenceAnalytics?.lowConfidenceCount > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: '#ca8a04' }} />
                <span className="text-sm font-medium" style={{ color: '#ca8a04', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  {confidenceAnalytics.lowConfidenceCount} low-confidence detections
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Confidence by Class */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Confidence by Class</h3>
        {topClasses.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topClasses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fill: "#666666", fontSize: 10 }} stroke="#d1d5db" />
              <YAxis 
                domain={[0, 1]}
                tick={{ fill: "#666666", fontSize: 10 }}
                tickFormatter={(value) => value.toFixed(2)}
                stroke="#d1d5db"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '8px',
                  color: '#000000',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
                formatter={(value) => value.toFixed(3)}
              />
              <Bar dataKey="confidence" fill="#2a2a2a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8" style={{ color: '#999999' }}>
            <p style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No confidence data</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ConfidenceAnalytics
