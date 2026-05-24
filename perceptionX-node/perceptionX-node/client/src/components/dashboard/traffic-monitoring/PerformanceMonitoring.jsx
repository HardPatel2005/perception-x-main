import { motion } from 'framer-motion'
import { Gauge, Zap, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PerformanceMonitoring = ({ performanceMetrics }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-6 shadow-sm"
      style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Gauge className="w-5 h-5" style={{ color: '#3b82f6' }} />
        Model Performance Monitoring
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-4 shadow-sm" style={{ background: '#fafafa', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
              <Zap className="w-4 h-4" style={{ color: '#eab308' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Avg Latency</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {performanceMetrics?.avgLatency || 0}ms
          </p>
          <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            Min: {performanceMetrics?.minLatency || 0}ms | Max: {performanceMetrics?.maxLatency || 0}ms
          </p>
        </div>

        <div className="rounded-lg p-4 shadow-sm" style={{ background: '#fafafa', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded" style={{ background: 'rgba(22, 163, 74, 0.1)' }}>
              <Activity className="w-4 h-4" style={{ color: '#16a34a' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>FPS</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {performanceMetrics?.fps || 0}
          </p>
          <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Frames per second</p>
        </div>

        <div className="rounded-lg p-4 shadow-sm" style={{ background: '#fafafa', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded" style={{ background: 'rgba(147, 51, 234, 0.1)' }}>
              <Activity className="w-4 h-4" style={{ color: '#9333ea' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Throughput</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {performanceMetrics?.detectionThroughput || 0}
          </p>
          <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Detections per minute</p>
        </div>
      </div>

      {performanceMetrics?.latencyTrend && performanceMetrics.latencyTrend.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Latency Trend</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={performanceMetrics.latencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="frame" 
                tick={{ fill: "#666666", fontSize: 10 }}
                stroke="#d1d5db"
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: "#666666", fontSize: 10 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                label={{ value: 'ms', position: 'insideTop', fill: '#666666' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '8px',
                  color: '#000000',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#2a2a2a"
                strokeWidth={2}
                dot={{ fill: "#2a2a2a", r: 3 }}
                name="Latency (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}

export default PerformanceMonitoring
