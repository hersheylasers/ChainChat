import { ArrowUpRight, ArrowDownRight } from "lucide-react"

export function PerformanceInsights() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm mb-1">Best Performing Asset</div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-secondary-foreground">wETH (wETH)</div>
            <div className="text-green-500 flex items-center text-sm">
              <ArrowUpRight className="w-4 h-4" />
              +1.76%
            </div>
          </div>
        </div>
        <div>
          <div className="text-sm mb-1">Worst Performing Asset</div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-secondary-foreground">USDC (USDC)</div>
            <div className="text-red-500 flex items-center text-sm">
              <ArrowDownRight className="w-4 h-4" />
              -0.15%
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-sm mb-1">Top Gain in USD</div>
        <div className="flex items-center gap-2">
          <div className="font-medium text-secondary-foreground">cbETH (cbETH)</div>
          <div className="text-green-500">+$754.41</div>
        </div>
      </div>
    </div>
  )
}

