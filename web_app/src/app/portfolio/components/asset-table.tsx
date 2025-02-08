import type { Asset } from "../types/portfolio"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AssetTableProps {
  assets: Asset[]
}

export function AssetTable({ assets }: AssetTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="">
          <TableHead className="">Asset</TableHead>
          <TableHead className=" text-right">Holdings</TableHead>
          <TableHead className=" text-right">Current Price</TableHead>
          <TableHead className=" text-right">Value</TableHead>
          <TableHead className=" text-right">24h Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.symbol} className="border-gray-800">
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <span className="">{asset.symbol}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">{asset.holdings}</TableCell>
            <TableCell className="text-right">${asset.currentPrice.toLocaleString()}</TableCell>
            <TableCell className="text-right">${asset.value.toLocaleString()}</TableCell>
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

