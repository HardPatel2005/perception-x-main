const ProgressBar = ({ progress, statusMessage }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className="rounded-xl bg-[#23233a] p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c840e9]/20 mb-4">
          <svg className="w-8 h-8 text-[#c840e9] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Processing</h3>
        <p className="text-sm text-gray-400">{statusMessage}</p>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Progress</span>
          <span className="text-white font-semibold">{Math.floor(clampedProgress)}%</span>
        </div>
        
        <div className="w-full bg-[#2a2a3a] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c840e9] to-[#a445b2] rounded-full transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default ProgressBar
