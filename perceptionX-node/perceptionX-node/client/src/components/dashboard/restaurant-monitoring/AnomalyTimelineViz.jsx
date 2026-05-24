import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { card, cardStyle, fontSans, STATUS_COLORS, STATUS_LABELS } from './constants'

const AnomalyTimelineViz = ({ anomalyTimeline, hasPersonData }) => {
  const [hovered, setHovered] = useState(null)

  const enriched = useMemo(() => {
    if (!anomalyTimeline?.length) return []
    if (hasPersonData) return anomalyTimeline
    return anomalyTimeline.map(seg => ({
      ...seg,
      status: seg.persons > 4 ? 'overcrowded'
            : seg.persons > 2 ? 'busy'
            : seg.persons > 0 ? 'normal'
            : seg.chairs > 8  ? 'busy'
            : seg.chairs > 0  ? 'normal'
            : 'empty'
    }))
  }, [anomalyTimeline, hasPersonData])

  const counts = useMemo(() => {
    const c = { empty: 0, normal: 0, busy: 0, overcrowded: 0 }
    enriched.forEach(s => { c[s.status] = (c[s.status] || 0) + 1 })
    return c
  }, [enriched])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
          <AlertCircle className="w-4 h-4" style={{ color: '#dc2626' }} />
          Anomaly Timeline
        </h3>
        <div className="flex gap-3">
          {Object.entries(counts).filter(([,v]) => v > 0).map(([s, n]) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${STATUS_COLORS[s]}20`, color: STATUS_COLORS[s] }}>
              {STATUS_LABELS[s]}: {n}
            </span>
          ))}
        </div>
      </div>
      {!hasPersonData && <p className="text-xs mb-3" style={{ color: '#999' }}>Status derived from chair count — many chairs = busy setup, empty frame = gray</p>}
      {enriched.length > 0 ? (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-px min-w-max" style={{ minHeight: 48 }}>
              {enriched.map((seg, i) => (
                <div key={i} className="relative cursor-pointer rounded-sm flex-shrink-0 transition-opacity"
                  style={{ width: 8, height: 48, backgroundColor: STATUS_COLORS[seg.status] || '#d1d5db',
                    opacity: hovered !== null && hovered !== i ? 0.45 : 1 }}
                  onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                  {hovered === i && (
                    <div className="absolute bottom-full mb-2 z-20 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg pointer-events-none"
                      style={{ background: '#1a1a1a', color: '#fff', left: '50%', transform: 'translateX(-50%)', minWidth: 130 }}>
                      <div className="font-semibold mb-0.5" style={{ color: STATUS_COLORS[seg.status] }}>{STATUS_LABELS[seg.status]}</div>
                      <div>Frame: {seg.frame}</div>
                      {seg.persons > 0 && <div>Persons: {seg.persons}</div>}
                      <div>Chairs: {seg.chairs}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-5 mt-3 flex-wrap">
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                <span className="text-xs" style={{ color: '#666' }}>{STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </>
      ) : <div className="text-center py-8 text-gray-400 text-sm">No anomaly timeline data</div>}
    </motion.div>
  )
}

export default AnomalyTimelineViz
