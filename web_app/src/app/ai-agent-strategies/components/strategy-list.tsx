import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"

const strategies = [
  { id: 1, name: "Momentum Trader", asset: "BTC/USD", status: "Active", profit: 12.5 },
  { id: 2, name: "Trend Follower", asset: "ETH/USD", status: "Active", profit: 8.2 },
  { id: 3, name: "Mean Reversion", asset: "SOL/USD", status: "Paused", profit: -2.1 },
]

export function StrategyList() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-gray-800">
          <TableHead className="text-gray-400">Strategy</TableHead>
          <TableHead className="text-gray-400">Asset</TableHead>
          <TableHead className="text-gray-400">Status</TableHead>
          <TableHead className="text-gray-400 text-right">Profit/Loss</TableHead>
          <TableHead className="text-gray-400 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {strategies.map((strategy) => (
          <TableRow key={strategy.id} className="border-gray-800">
            <TableCell className="font-medium text-gray-300">{strategy.name}</TableCell>
            <TableCell className="text-gray-300">{strategy.asset}</TableCell>
            <TableCell>
              <Badge variant={strategy.status === "Active" ? "success" : "secondary"}>{strategy.status}</Badge>
            </TableCell>
            <TableCell className={`text-right ${strategy.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {strategy.profit >= 0 ? "+" : ""}
              {strategy.profit}%
            </TableCell>
            <TableCell className="text-right">
              <Switch checked={strategy.status === "Active"} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

