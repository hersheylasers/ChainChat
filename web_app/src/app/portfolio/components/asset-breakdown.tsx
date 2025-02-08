"use client"

import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

export function AssetBreakdown() {
  const data = {
    labels: ["wETH", "cbETH", "USDC"],
    datasets: [
      {
        data: [49323.5, 6982.92, 2037.0],
        backgroundColor: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#4A90E2"],
        borderWidth: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "rgb(156, 163, 175)",
          boxWidth: 15,
          padding: 10,
        },
      },
    },
  }

  return (
    <div className="h-[200px]">
      <Pie data={data} options={options} />
    </div>
  )
}

