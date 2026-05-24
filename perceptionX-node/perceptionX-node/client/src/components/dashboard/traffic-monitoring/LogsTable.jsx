import { motion } from 'framer-motion'

const LogsTable = ({ logs }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.1 }}
      className="rounded-xl bg-[#23233a] p-5"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Detection Logs</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Frame ID</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Time</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Objects Detected</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Vehicle Count</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Inference Latency</th>
            </tr>
          </thead>
          <tbody>
            {logs && logs.length > 0 ? (
              logs.map((log, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm text-white font-medium">{log.frameId}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{log.timestamp}</td>
                  <td className="py-3 px-4 text-sm text-gray-300">{log.objects}</td>
                  <td className="py-3 px-4 text-sm text-white font-medium">{log.totalObjects}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{log.inferenceTime}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-400">
                  No detection logs available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default LogsTable
