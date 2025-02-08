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
          <TableRow className="">
            <TableHead className="">Date</TableHead>
            <TableHead className="">Type</TableHead>
            <TableHead className="">Asset</TableHead>
            <TableHead className=" text-right">Amount</TableHead>
            <TableHead className=" text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentTransactions.map((tx) => (
            <TableRow key={tx.id} className="">
              <TableCell className="">{tx.date}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    tx.type === "Buy" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {tx.type}
                </span>
              </TableCell>
              <TableCell className="">{tx.asset}</TableCell>
              <TableCell className="text-right ">{tx.amount}</TableCell>
              <TableCell className="text-right ">${tx.value.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

