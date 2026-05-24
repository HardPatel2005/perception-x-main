import { motion } from 'framer-motion'
import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const VEHICLE_COLORS = {
  Car: '#3b82f6',
  Bus: '#10b981',
  Truck: '#f59e0b',
  Motorcycle: '#ef4444',
  Bicycle: '#8b5cf6',
  Other: '#6b7280'
}

const ObjectDistribution = ({ objectDistribution }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-5 shadow-sm flex flex-col"
      style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
    >
      <h3 className="text-base font-semibold mb-3" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Vehicle Class Distribution</h3>
      {objectDistribution && objectDistribution.length > 0 ? (
        <div className="flex-1 flex flex-col gap-3">
          {/* Pie Chart - Top */}
          <div className="w-full">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={objectDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {objectDistribution.map((entry, index) => {
                    const baseColor = VEHICLE_COLORS[entry.name] || VEHICLE_COLORS.Other
                    const isHovered = hoveredIndex === index
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isHovered ? baseColor : baseColor}
                        opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.3 : 1}
                        style={{
                          filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      />
                    )
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: '8px',
                    color: '#000000',
                    padding: '12px 16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    fontSize: '13px'
                  }}
                  labelStyle={{
                    color: '#000000',
                    fontWeight: 700,
                    marginBottom: '8px',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  itemStyle={{
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '2px 0'
                  }}
                  formatter={(value, name, props) => {
                    const percentage = props.payload.percentage || '0'
                    return [`${value} (${percentage}%)`, name]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Stats Cards - Below Pie Chart in Grid */}
          <div className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {objectDistribution.map((item, idx) => {
                const isHovered = hoveredIndex === idx
                return (
                  <div 
                    key={idx} 
                    className="rounded-lg p-3 transition-all duration-200 cursor-pointer border"
                    style={{
                      backgroundColor: isHovered ? '#f5f5f5' : '#fafafa',
                      borderColor: isHovered ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.08)',
                      boxShadow: isHovered ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                      transform: isHovered ? 'scale(1.02)' : 'scale(1)'
                    }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div 
                        className="w-3 h-3 rounded-full transition-all"
                        style={{ 
                          backgroundColor: VEHICLE_COLORS[item.name] || VEHICLE_COLORS.Other,
                          boxShadow: isHovered ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                      />
                      <span className="text-xs font-medium transition-colors" style={{ 
                        color: isHovered ? '#3b82f6' : '#666666',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}>{item.name}</span>
                    </div>
                    <p className="text-lg font-bold transition-colors" style={{ 
                      color: isHovered ? '#3b82f6' : '#000000',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>{item.value}</p>
                    <p className="text-xs" style={{ 
                      color: '#999999',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}>{item.percentage}%</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8" style={{ color: '#999999' }}>
          <p className="text-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No vehicle detections</p>
        </div>
      )}
    </motion.div>
  )
}

export default ObjectDistribution
