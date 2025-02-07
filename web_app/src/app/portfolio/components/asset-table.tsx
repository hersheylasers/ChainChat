import type { Asset } from "../types/portfolio"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AssetTableProps {
  assets: Asset[]
}

export function AssetTable({ assets }: AssetTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-gray-800">
          <TableHead className="text-gray-400">Asset</TableHead>
          <TableHead className="text-gray-400 text-right">Holdings</TableHead>
          <TableHead className="text-gray-400 text-right">Current Price</TableHead>
          <TableHead className="text-gray-400 text-right">Value</TableHead>
          <TableHead className="text-gray-400 text-right">24h Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.symbol} className="border-gray-800">
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-gray-300">{asset.symbol}</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-gray-300">{asset.holdings}</TableCell>
            <TableCell className="text-right text-gray-300">${asset.currentPrice.toLocaleString()}</TableCell>
            <TableCell className="text-right text-gray-300">${asset.value.toLocaleString()}</TableCell>
            <TableCell className={`text-right ${asset.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
              {asset.change24h >= 0 ? "+" : ""}
              {asset.change24h}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

