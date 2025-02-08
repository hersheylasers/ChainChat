"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"

const data = [
  { date: "Jan", value: 50000 },
  { date: "Feb", value: 55000 },
  { date: "Mar", value: 48000 },
  { date: "Apr", value: 52000 },
  { date: "May", value: 49000 },
  { date: "Jun", value: 63313 },
]

export function PortfolioChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke="#38BDF8" strokeWidth={2} dot={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <Card className="p-2">
                  <div className="text-sm">{payload[0].payload.date}</div>
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

