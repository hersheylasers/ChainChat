import { Table, TableBody, TableHeader, TableCell, TableHead, TableRow } from "@/components/ui/table"

const recentTransactions = [
  {
    id: 1,
    date: "2024-02-07",
    type: "Buy",
    asset: "wETH",
    amount: 0.05,
    value: 132.02,
  },
  {
    id: 2,
    date: "2024-02-06",
    type: "Sell",
    asset: "cbETH",
    amount: 1.2,
    value: 4189.75,
  },
  {
    id: 3,
    date: "2024-02-05",
    type: "Buy",
    asset: "USDC",
    amount: 10,
    value: 10.002,
  },
]

export function TransactionsTable() {
  return (
    <div className="max-h-[250px] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800">
            <TableHead className="text-gray-400">Date</TableHead>
            <TableHead className="text-gray-400">Type</TableHead>
            <TableHead className="text-gray-400">Asset</TableHead>
            <TableHead className="text-gray-400 text-right">Amount</TableHead>
            <TableHead className="text-gray-400 text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentTransactions.map((tx) => (
            <TableRow key={tx.id} className="border-gray-800">
              <TableCell className="text-gray-300">{tx.date}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    tx.type === "Buy" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {tx.type}
                </span>
              </TableCell>
              <TableCell className="text-gray-300">{tx.asset}</TableCell>
              <TableCell className="text-right text-gray-300">{tx.amount}</TableCell>
              <TableCell className="text-right text-gray-300">${tx.value.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

