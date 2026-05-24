import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const DiningTableTimeline = ({ occupancyData }) => {
  const hasData = occupancyData?.some(d => d.tables > 0 || d.chairs > 0) ?? false
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-4" style={{ color: '#000', fontFamily: fontSans }}>Dining Table Count Timeline</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={occupancyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis dataKey="frame" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <YAxis allowDecimals={false} tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <Tooltip contentStyle={ttStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="stepAfter" dataKey="tables" stroke="#92400e" strokeWidth={2.5} dot={false} name="Dining Tables" />
            <Line type="stepAfter" dataKey="chairs" stroke="#a16207" strokeWidth={1.5} dot={false} name="Chairs" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      ) : <div className="text-center py-10 text-gray-400 text-sm">No furniture data available</div>}
    </motion.div>
  )
}

export default DiningTableTimeline
