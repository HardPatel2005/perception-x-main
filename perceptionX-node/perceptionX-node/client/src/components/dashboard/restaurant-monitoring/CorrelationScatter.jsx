import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { card, cardStyle, fontSans, ttStyle } from './constants'

const CorrelationScatter = ({ occupancyData, hasPersonData }) => {
  const scatterData = useMemo(() => (occupancyData || []).map(d => ({
    x: hasPersonData ? d.chairs : d.tables,
    y: hasPersonData ? d.persons : d.chairs,
    z: d.tables,
    frame: d.frame
  })), [occupancyData, hasPersonData])

  const title  = hasPersonData ? 'Chairs vs Persons Correlation' : 'Tables vs Chairs Correlation'
  const xLabel = hasPersonData ? 'Chairs' : 'Tables'
  const yLabel = hasPersonData ? 'Persons' : 'Chairs'
  const desc   = hasPersonData
    ? 'Each dot = one frame. Green = dining table present, amber = no table'
    : 'Each dot = one frame. Shows chairs/table pairing across frames'

  const hasData = scatterData.some(d => d.x > 0 || d.y > 0)

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <h3 className="text-base font-semibold mb-1" style={{ color: '#000', fontFamily: fontSans }}>{title}</h3>
      <p className="text-xs mb-4" style={{ color: '#999' }}>{desc}</p>
      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 4, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis type="number" dataKey="x" name={xLabel} tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db"
              label={{ value: xLabel, position: 'insideBottom', offset: -4, fill: '#666', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name={yLabel} tick={{ fill: '#666', fontSize: 10 }} stroke="#d1d5db"
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[30, 100]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={ttStyle}
              formatter={(v, n) => [v, n === 'x' ? xLabel : n === 'y' ? yLabel : 'Tables']}
              labelFormatter={(_, pl) => pl?.[0] ? `Frame ${pl[0].payload.frame}` : ''} />
            <Scatter data={scatterData}>
              {scatterData.map((e, i) => (
                <Cell key={i} fill={e.z > 0 ? '#22c55e' : '#f59e0b'} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : <div className="text-center py-10 text-gray-400 text-sm">No correlation data available</div>}
    </motion.div>
  )
}

export default CorrelationScatter
