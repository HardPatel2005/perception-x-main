import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { card, cardStyle, fontSans } from './constants'

const RawDataTable = ({ framesData }) => {
  const [page, setPage]     = useState(0)
  const [sortBy, setSortBy] = useState('frame')
  const [sortDir, setDir]   = useState('asc')
  const PAGE = 15

  const sorted = useMemo(() => {
    if (!framesData?.length) return []
    return [...framesData].sort((a, b) => {
      const diff = (a[sortBy] ?? 0) - (b[sortBy] ?? 0)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [framesData, sortBy, sortDir])

  const total = sorted.length
  const rows  = sorted.slice(page * PAGE, (page + 1) * PAGE)
  const pages = Math.ceil(total / PAGE)

  const handleSort = col => {
    if (sortBy === col) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setDir('asc') }
    setPage(0)
  }

  const cols = [
    { key: 'frame',       label: 'Frame' },
    { key: 'persons',     label: 'Persons' },
    { key: 'chairs',      label: 'Chairs' },
    { key: 'tables',      label: 'Tables' },
    { key: 'remotes',     label: 'Remotes' },
    { key: 'inferenceMs', label: 'Inference (ms)' }
  ]

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={card} style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: '#000', fontFamily: fontSans }}>Raw Detection Data</h3>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#f5f5f5', color: '#666' }}>{total} sampled frames</span>
      </div>
      {total > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                  {cols.map(c => (
                    <th key={c.key} className="px-3 py-2.5 text-left cursor-pointer select-none hover:bg-gray-100 transition-colors"
                      style={{ color: '#444', fontWeight: 600 }} onClick={() => handleSort(c.key)}>
                      <div className="flex items-center gap-1">
                        {c.label}
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                        {sortBy === c.key && <span style={{ color: '#f59e0b' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: row.isAnomaly ? 'rgba(239,68,68,0.05)' : i % 2 === 0 ? '#fff' : '#fafafa'
                  }}>
                    <td className="px-3 py-2 font-mono font-medium" style={{ color: row.isAnomaly ? '#dc2626' : '#333' }}>{row.frame}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: row.persons > 4 ? '#dc2626' : row.persons > 0 ? '#f59e0b' : '#bbb' }}>
                      {row.persons > 4 ? `⚠ ${row.persons}` : row.persons || '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: row.chairs > 0 ? '#a16207' : '#bbb' }}>{row.chairs || '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: row.tables > 0 ? '#92400e' : '#bbb' }}>{row.tables || '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: row.remotes > 1 ? '#ca8a04' : '#bbb' }}>{row.remotes || '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: row.inferenceMs > 150 ? '#dc2626' : row.inferenceMs > 100 ? '#f59e0b' : row.inferenceMs > 0 ? '#22c55e' : '#bbb' }}>
                      {row.inferenceMs > 0 ? `${row.inferenceMs}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs" style={{ color: '#999' }}>Page {page + 1} of {pages} · {total} rows</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2 py-1 rounded disabled:opacity-30 transition-colors"
                  style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#333' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, pages) }, (_, j) => {
                  const start = Math.max(0, Math.min(page - 2, pages - 5))
                  const p = start + j
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                      style={{ border: '1px solid rgba(0,0,0,0.1)', background: page === p ? '#f59e0b' : '#fff', color: page === p ? '#fff' : '#333' }}>
                      {p + 1}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}
                  className="px-2 py-1 rounded disabled:opacity-30 transition-colors"
                  style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#333' }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : <div className="text-center py-10 text-gray-400 text-sm">No frame data available</div>}
    </motion.div>
  )
}

export default RawDataTable
