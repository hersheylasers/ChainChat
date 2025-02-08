import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StrategyList } from "./components/strategy-list"
import { StrategyPerformance } from "./components/strategy-performance"
import { CreateStrategyForm } from "./components/create-strategy-form"

export default function AIStrategiesPage() {
  return (
    <div className="min-h-screen">
      <main className="pl-16 p-6">
        <h1 className="text-2xl font-bold mb-6">AI Trading Strategies</h1>
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Active Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyList />
            </CardContent>
          </Card>
          <Card className="">
            <CardHeader>
              <CardTitle>Create New Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateStrategyForm />
            </CardContent>
          </Card>
          <Card className=" xl:col-span-3">
            <CardHeader>
              <CardTitle>Strategy Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyPerformance />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

