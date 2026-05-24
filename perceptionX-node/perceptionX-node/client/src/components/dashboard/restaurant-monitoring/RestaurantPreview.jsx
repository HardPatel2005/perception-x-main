import { useRef, useImperativeHandle, forwardRef } from 'react'
import { Camera, UtensilsCrossed, Users, TrendingUp, Activity, Armchair } from 'lucide-react'
import { card, cardStyle, fontSans } from './constants'

const RestaurantPreview = forwardRef(({ videoUrl, isVideo, data, hasPersonData, maxChairs }, ref) => {
  const videoRef = useRef(null)
  const containerRef = useRef(null)

  useImperativeHandle(ref, () => ({
    seekToTime: (timeInSeconds) => {
      if (videoRef.current && isVideo) {
        videoRef.current.currentTime = timeInSeconds
        videoRef.current.pause()
        // Scroll to video preview
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
  }))

  return (
    <div ref={containerRef} className={card} style={cardStyle}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000', fontFamily: fontSans }}>
        <Camera className="w-5 h-5" style={{ color: '#f59e0b' }} /> Kitchen / Restaurant Scene Preview
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative bg-black rounded-xl overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
          {videoUrl ? (
            isVideo
              ? <video ref={videoRef} controls autoPlay loop muted playsInline className="w-full h-full object-contain" preload="auto"><source src={videoUrl} type="video/mp4" /></video>
              : <img src={videoUrl} alt="Kitchen Preview" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: '#999' }}>
              <div className="text-center"><UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No media available</p></div>
            </div>
          )}
        </div>
      <div className="bg-gray-50 rounded-xl p-5 flex flex-col justify-between" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        {[
          { label: hasPersonData ? 'Peak Persons' : 'Peak Chairs',   value: hasPersonData ? (data.sceneOverview?.peakPersons ?? 0)   : maxChairs,                           sub: hasPersonData ? 'Max simultaneous' : 'Max in any frame', icon: hasPersonData ? Users : Armchair, color: '#f59e0b' },
          { label: 'Item Diversity',  value: data.sceneOverview?.itemDiversity ?? 0,  sub: 'Unique item types',   icon: UtensilsCrossed, color: '#3b82f6' },
          { label: 'Peak Items',      value: data.sceneOverview?.peakItems ?? 0,      sub: 'Max items/frame',     icon: TrendingUp,      color: '#ef4444' }
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" style={{ color: s.color }} /><span className="text-xs font-medium" style={{ color: '#666' }}>{s.label}</span></div>
              <p className="text-2xl font-bold" style={{ color: '#000' }}>{s.value}</p>
              <p className="text-xs" style={{ color: '#999' }}>{s.sub}</p>
            </div>
          )
        })}
        <div className="pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4" style={{ color: '#f97316' }} /><span className="text-xs font-medium" style={{ color: '#666' }}>Kitchen Activity</span></div>
          <p className={`text-lg font-bold ${
            data.sceneOverview?.kitchenActivityLevel === 'Very High' ? 'text-red-600' :
            data.sceneOverview?.kitchenActivityLevel === 'High' ? 'text-red-500' :
            data.sceneOverview?.kitchenActivityLevel === 'Moderate' ? 'text-yellow-500' :
            data.sceneOverview?.kitchenActivityLevel === 'Low' ? 'text-green-500' : 'text-gray-400'
          }`}>{data.sceneOverview?.kitchenActivityLevel || 'Very Low'}</p>
        </div>
      </div>
    </div>
  </div>
  )
})

RestaurantPreview.displayName = 'RestaurantPreview'

export default RestaurantPreview
