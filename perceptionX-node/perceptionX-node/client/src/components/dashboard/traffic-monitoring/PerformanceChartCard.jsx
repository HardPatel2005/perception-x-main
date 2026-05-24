import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '../../../lib/utils'

const tabs = ["Accounts", "Purchases", "Sessions"]

const PerformanceChartCard = ({ data }) => {
  const [activeTab, setActiveTab] = useState("Accounts")

  // Transform data to match the chart format
  const chartData = (data?.vehicleTrafficData || []).slice(0, 12).map((item, idx) => {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    return {
      month: months[idx % 12] || item.time,
      value: item.vehicles || 0
    }
  })

  return (
    <div className="rounded-xl bg-[#23233a] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Total Shipments
          </p>
          <h3 className="text-xl font-bold text-white">Performance</h3>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#2a2a3a] p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                activeTab === tab
                  ? "bg-[#c840e9] text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2a2a3a"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#8b8b9e", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8b8b9e", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 120]}
            />
            <Tooltip
              contentStyle={{
                background: "#23233a",
                border: "1px solid #2a2a3a",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#c840e9"
              strokeWidth={3}
              dot={{ fill: "#c840e9", r: 4, stroke: "#c840e9" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default PerformanceChartCard
