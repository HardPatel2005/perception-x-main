import { useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle, CATEGORY_COLORS } from './constants'

const CategoryDistributionChart = ({ categoryDistribution }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={`${card} flex flex-col`} style={cardStyle}>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#000', fontFamily: fontSans }}>Category Distribution</h3>
      {categoryDistribution?.length > 0 ? (
        <div className="flex-1 flex flex-col gap-3">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={88} paddingAngle={4} dataKey="value">
                {categoryDistribution.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[categoryDistribution[i].name] || '#6b7280'}
                    opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1}
                    style={{ transition: 'opacity 0.2s', cursor: 'pointer' }} />
                ))}
              </Pie>
              <Tooltip contentStyle={ttStyle}
                formatter={(v, n, props) => [`${v} (${props.payload.percentage}%)`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2">
            {categoryDistribution.map((item, i) => (
              <div key={i} className="rounded-lg p-2.5 border cursor-pointer transition-all duration-200"
                style={{ backgroundColor: hoveredIndex === i ? '#f5f5f5' : '#fafafa',
                  borderColor: hoveredIndex === i ? 'rgba(245,158,11,0.3)' : 'rgba(0,0,0,0.08)' }}
                onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#6b7280' }} />
                  <span className="text-xs font-medium" style={{ color: '#666' }}>{item.name}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: '#000' }}>{item.value}</p>
                <p className="text-xs" style={{ color: '#999' }}>{item.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="text-center py-10 text-gray-400 text-sm">No category data</div>}
    </motion.div>
  )
}

export default CategoryDistributionChart
