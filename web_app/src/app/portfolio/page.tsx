import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetTable } from "./components/asset-table"
import { PortfolioChart } from "./components/portfolio-chart"
import { AssetBreakdown } from "./components/asset-breakdown"
import { PerformanceInsights } from "./components/performance-insights"
import { TransactionsTable } from "./components/transactions-table"

const mockAssets = [
  // {
  //   symbol: "BTC",
  //   name: "Bitcoin",
  //   holdings: 0.5,
  //   currentPrice: 48647.0,
  //   value: 49323.5,
  //   change24h: 1.52,
  // },
  // {
  //   symbol: "ETH",
  //   name: "Ethereum",
  //   holdings: 2,
  //   currentPrice: 3491.46,
  //   value: 6982.92,
  //   change24h: 0.76,
  // },

  {
    symbol: "wETH",
    name: "Wrapped Ethereum",
    holdings: 3,
    currentPrice: 2640.4,
    value: 7921.2,
    change24h: 0.24,
  },
  {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked Ethereum",
    holdings: 2,
    currentPrice: 2840.35,
    value: 5680.7,
    change24h: 0.64,
  },
  {
    symbol: "USDC",
    name: "USDC",
    holdings: 2,
    currentPrice: 1,
    value: 2.001,
    change24h: 0.96,
  },
  // ... other assets
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#000814] text-white">
      <main className="pl-16 p-6">
        <h1 className="text-2xl font-bold mb-6">My Portfolio</h1>
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
          <Card className="bg-black/40 border-gray-800 xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-400">Total Portfolio Value</CardTitle>
              <div className="mt-2">
                <div className="text-3xl font-bold">$63,313.63</div>
                <div className="text-green-500 text-sm">+1.41%</div>
              </div>
            </CardHeader>
            <CardContent>
              <PortfolioChart />
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle>Asset Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetBreakdown />
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-gray-800 xl:col-span-2">
            <CardHeader>
              <CardTitle>Your Holdings</CardTitle>
            </CardHeader>
            <AssetTable assets={mockAssets} />
          </Card>
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceInsights />
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-gray-800 xl:col-span-3">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

