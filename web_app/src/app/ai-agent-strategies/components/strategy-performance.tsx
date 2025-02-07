"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"

const performanceData = [
  { date: "Jan", value: 1000 },
  { date: "Feb", value: 1200 },
  { date: "Mar", value: 1100 },
  { date: "Apr", value: 1400 },
  { date: "May", value: 1300 },
  { date: "Jun", value: 1600 },
]

export function StrategyPerformance() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={performanceData}>
        <Line type="monotone" dataKey="value" stroke="#38BDF8" strokeWidth={2} dot={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <Card className="p-2 bg-black/80 border-gray-800">
                  <div className="text-sm text-gray-400">{payload[0].payload.date}</div>
                  <div className="font-medium">${payload[0].value?.toLocaleString()}</div>
                </Card>
              )
            }
            return null
          }}
        />
        <XAxis dataKey="date" stroke="#4B5563" />
        <YAxis stroke="#4B5563" />
      </LineChart>
    </ResponsiveContainer>
  )
}

