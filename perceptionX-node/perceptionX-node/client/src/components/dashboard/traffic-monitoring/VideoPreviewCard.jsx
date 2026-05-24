import { Car, Users, Activity, Circle, Camera, TrendingUp, FileVideo } from 'lucide-react'

const VideoPreviewCard = ({ videoUrl, isVideo, vehicleCount, pedestrianCount, density, signalStatus, peakVehicles, peakPedestrians, totalFrames }) => {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Camera className="w-5 h-5" style={{ color: '#2a2a2a' }} />
        Traffic Scene Preview
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Preview */}
        <div className="lg:col-span-3 relative bg-black rounded-xl overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
          {videoUrl ? (
            isVideo ? (
              <video
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
                preload="auto"
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              <img
                src={videoUrl}
                alt="Traffic Preview"
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: '#999999' }}>
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>No video available</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="bg-gray-50 rounded-xl p-5 flex flex-col justify-between shadow-sm" style={{ border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: '#3b82f6' }} />
                <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Peak Vehicles</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{peakVehicles || 0}</p>
              <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Max in single frame</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: '#ec4899' }} />
                <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Peak Pedestrians</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{peakPedestrians || 0}</p>
              <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Max in single frame</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileVideo className="w-4 h-4" style={{ color: '#9333ea' }} />
                <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Frames Analyzed</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{totalFrames || 0}</p>
              <p className="text-xs mt-1" style={{ color: '#999999', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Total frames processed</p>
            </div>
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" style={{ color: '#f97316' }} />
              <span className="text-xs font-medium" style={{ color: '#666666', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Density Level</span>
            </div>
            <p className={`text-lg font-bold ${
              density === 'Very High' ? 'text-red-600' :
              density === 'High' ? 'text-red-500' :
              density === 'Moderate' ? 'text-yellow-500' :
              density === 'Low' ? 'text-green-500' :
              'text-green-600'
            }`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {density || 'Very Low'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPreviewCard
