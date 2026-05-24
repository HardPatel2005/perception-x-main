import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle, ITEM_COLORS } from './constants'

const ObjectDistributionChart = ({ itemDistribution }) => (
  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
    className={`${card} flex flex-col`} style={cardStyle}>
    <h3 className="text-base font-semibold mb-4" style={{ color: '#000', fontFamily: fontSans }}>Object Class Distribution</h3>
    {itemDistribution?.length > 0 ? (
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={Math.max(180, Math.min(itemDistribution.length, 14) * 32)}>
          <BarChart data={itemDistribution.slice(0, 14)} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} horizontal={false} />
            <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <YAxis type="category" dataKey="name" tick={{ fill: '#555', fontSize: 10 }} width={90} stroke="#d1d5db" />
            <Tooltip contentStyle={ttStyle}
              formatter={(v, _n, props) => [`${v} (${props.payload.percentage}%)`, props.payload.category || 'Item']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {itemDistribution.slice(0, 14).map((e, i) => (
                <Cell key={i} fill={ITEM_COLORS[e.name] || '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : <div className="text-center py-10 text-gray-400 text-sm">No item distribution data</div>}
  </motion.div>
)

export default ObjectDistributionChart
