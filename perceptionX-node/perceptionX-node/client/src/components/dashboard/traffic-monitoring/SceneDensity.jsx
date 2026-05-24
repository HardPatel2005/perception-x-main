import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SceneDensity = ({ sceneDensity }) => {

  // Calculate video duration and determine time unit
  const videoDurationSeconds = sceneDensity?.videoDurationSeconds || 0;
  const totalFrames = sceneDensity?.totalFrames || 0;
  const useMinutes = videoDurationSeconds >= 120; // Use minutes if video is 2+ minutes
  const timeUnit = useMinutes ? 'min' : 'sec';

  // Convert frames to timeline data
  const frames = sceneDensity?.frames || [];

  // Use the full video duration (calculated from all events, not just sampled frames)
  let effectiveDuration = videoDurationSeconds;

  // If duration is still 0, estimate from total frames
  if (effectiveDuration <= 0 && totalFrames > 0) {
    effectiveDuration = totalFrames / 30; // Assume 30 FPS
  } else if (effectiveDuration <= 0) {
    // Final fallback: estimate from sampled frames
    const maxFrame = frames.length > 0
      ? Math.max(...frames.map(f => f.frame !== undefined ? f.frame : 0), frames.length - 1)
      : frames.length;
    effectiveDuration = (maxFrame + 1) / 30;
  }

  const chartData = frames.map((frame, idx) => {
    // Get the actual frame number from the data
    const frameNumber = frame.frame !== undefined ? frame.frame : idx;

    // Calculate time based on frame position in the FULL video
    // Use frame number to map to the full video timeline
    let timeInSeconds = 0;

    if (totalFrames > 0 && effectiveDuration > 0) {
      // Map frame number to full video duration
      const progress = totalFrames > 1 ? frameNumber / (totalFrames - 1) : 0;
      timeInSeconds = progress * effectiveDuration;
    } else if (effectiveDuration > 0 && frames.length > 1) {
      // Fallback: use index position
      const progress = idx / (frames.length - 1);
      timeInSeconds = progress * effectiveDuration;
    } else {
      // Final fallback: assume 30 FPS
      timeInSeconds = frameNumber / 30;
    }

    // Convert to display time
    const displayTime = useMinutes
      ? parseFloat((timeInSeconds / 60).toFixed(1))
      : Math.round(timeInSeconds);

    return {
      time: timeInSeconds, // Use actual seconds for chart
      timeDisplay: displayTime, // For display purposes
      timeInSeconds: timeInSeconds,
      vehicles: frame.vehicles || 0,
      pedestrians: frame.pedestrians || 0,
      total: frame.totalObjects || 0
    };
  })

  // Debug: Log first few data points
  if (chartData.length > 0) {
    console.log('Chart data sample:', chartData.slice(0, 3), '...', chartData.slice(-2));
    console.log('Video duration:', effectiveDuration, 'seconds');
    console.log('Total frames:', totalFrames, 'Sampled frames:', frames.length);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl bg-white p-6 shadow-sm"
      style={{ border: '1px solid rgba(0, 0, 0, 0.12)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <TrendingUp className="w-5 h-5" style={{ color: '#3b82f6' }} />
        Density Trend
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="vehicleDensityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="pedestrianDensityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis
            dataKey="time"
            type="number"
            scale="linear"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: "#666666", fontSize: 11, fontWeight: 500 }}
            label={{
              value: useMinutes ? 'Time (minutes)' : 'Time (seconds)',
              position: 'insideBottom',
              offset: -5,
              fill: '#666666',
              fontSize: 12,
              fontWeight: 600
            }}
            stroke="#d1d5db"
            tickFormatter={(value) => {
              const displayValue = useMinutes
                ? parseFloat((value / 60).toFixed(1))
                : Math.round(value);
              return `${displayValue}${timeUnit}`;
            }}
          />
          <YAxis
            tick={{ fill: "#666666", fontSize: 11, fontWeight: 500 }}
            label={{
              value: 'Density',
              angle: -90,
              position: 'insideLeft',
              fill: '#666666',
              fontSize: 12,
              fontWeight: 600
            }}
            stroke="#d1d5db"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: '8px',
              color: '#000000',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            labelStyle={{
              color: '#000000',
              fontWeight: 600,
              marginBottom: '8px',
              fontSize: 13
            }}
            itemStyle={{
              color: '#000000',
              fontSize: 12
            }}
            formatter={(value, name) => {
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              // Get the actual time from the payload data
              const dataPoint = payload && payload[0]?.payload;
              if (dataPoint) {
                const timeValue = dataPoint.timeInSeconds || dataPoint.time || 0;
                if (useMinutes) {
                  return `Time: ${(timeValue / 60).toFixed(1)} minutes`;
                }
                return `Time: ${Math.round(timeValue)} seconds`;
              }
              // Fallback
              const timeValue = parseFloat(label) || 0;
              if (useMinutes) {
                return `Time: ${timeValue.toFixed(1)} minutes`;
              }
              return `Time: ${Math.round(timeValue)} seconds`;
            }}
          />
          <Area
            type="monotone"
            dataKey="vehicles"
            stroke="#3b82f6"
            fill="url(#vehicleDensityGradient)"
            name="Vehicles"
          />
          <Area
            type="monotone"
            dataKey="pedestrians"
            stroke="#ec4899"
            fill="url(#pedestrianDensityGradient)"
            name="Pedestrians"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

export default SceneDensity
