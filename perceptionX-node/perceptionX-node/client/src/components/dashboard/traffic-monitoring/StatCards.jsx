import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'
import { Car, Activity, CheckCircle2 } from 'lucide-react'

const shipmentsData = [
  { m: "JUL", v: 20 },
  { m: "AUG", v: 80 },
  { m: "SEP", v: 130 },
  { m: "OCT", v: 60 },
  { m: "NOV", v: 40 },
  { m: "DEC", v: 55 },
]

const salesData = [
  { c: "USA", v: 110 },
  { c: "GER", v: 80 },
  { c: "AUS", v: 90 },
  { c: "UK", v: 50 },
  { c: "RO", v: 30 },
  { c: "BR", v: 60 },
]

const tasksData = [
  { m: "JUL", v: 60 },
  { m: "AUG", v: 75 },
  { m: "SEP", v: 55 },
  { m: "OCT", v: 90 },
  { m: "NOV", v: 70 },
  { m: "DEC", v: 85 },
]

function StatCard({ title, value, icon, chart }) {
  return (
    <div className="rounded-xl bg-[#23233a] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {icon}
            <span className="text-2xl font-bold text-white">{value}</span>
          </div>
        </div>
      </div>
      <div className="h-[140px]">{chart}</div>
    </div>
  )
}

const StatCards = ({ data }) => {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <StatCard
        title="Total Shipments"
        value={data?.totalVehicles?.toLocaleString() || "763,215"}
        icon={<Car className="h-5 w-5 text-[#c840e9]" />}
        chart={
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shipmentsData}>
              <XAxis
                dataKey="m"
                tick={{ fill: "#8b8b9e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 150]} />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#c840e9"
                strokeWidth={2}
                dot={{ fill: "#c840e9", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        }
      />
      <StatCard
        title="Daily Sales"
        value="€ 3,500"
        icon={<Activity className="h-5 w-5 text-[#3b82f6]" />}
        chart={
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <XAxis
                dataKey="c"
                tick={{ fill: "#8b8b9e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 140]} />
              <Bar
                dataKey="v"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        }
      />
      <StatCard
        title="Completed Tasks"
        value={data?.totalFrames?.toLocaleString() + "K" || "12,100K"}
        icon={<CheckCircle2 className="h-5 w-5 text-[#10b981]" />}
        chart={
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tasksData}>
              <XAxis
                dataKey="m"
                tick={{ fill: "#8b8b9e", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 120]} />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        }
      />
    </div>
  )
}

export default StatCards
