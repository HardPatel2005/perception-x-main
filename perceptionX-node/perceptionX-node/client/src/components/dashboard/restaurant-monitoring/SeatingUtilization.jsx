import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const SeatingUtilization = ({ occupancyData, hasPersonData }) => {
  const hasChairs = occupancyData?.some(d => d.chairs > 0) ?? false
  const hasPersons = hasPersonData && (occupancyData?.some(d => d.persons > 0) ?? false)
  const title = hasPersons ? 'Seating Utilisation' : 'Furniture Count Over Time'
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <BarChart2 className="w-5 h-5" style={{ color: '#3b82f6' }} /> {title}
      </h3>
      {hasChairs ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={occupancyData}>
            <defs>
              <linearGradient id="chairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#a16207" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#a16207" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="tableGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#92400e" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#92400e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="personGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis dataKey="frame" tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db" />
            <Tooltip contentStyle={ttStyle} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="chairs" stroke="#a16207" fill="url(#chairGrad)" name="Chairs" dot={false} />
            <Area type="monotone" dataKey="tables" stroke="#92400e" fill="url(#tableGrad)" name="Tables" dot={false} />
            {hasPersons && <Area type="monotone" dataKey="persons" stroke="#f59e0b" fill="url(#personGrad2)" name="Persons" dot={false} />}
          </AreaChart>
        </ResponsiveContainer>
      ) : <div className="text-center py-12 text-gray-400 text-sm">No furniture detected in this recording</div>}
    </motion.div>
  )
}

export default SeatingUtilization
