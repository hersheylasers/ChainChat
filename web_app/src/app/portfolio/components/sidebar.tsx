import Link from "next/link"
import { Home, BarChart2, Star, Layout, Settings } from "lucide-react"

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-black/40 border-r border-gray-800 flex flex-col items-center py-4 gap-6">
      <Link href="/" className="p-3 rounded-lg bg-blue-600">
        <Home className="w-5 h-5" />
      </Link>
      <Link href="/starred" className="p-3 rounded-lg hover:bg-gray-800">
        <Star className="w-5 h-5" />
      </Link>
      <Link href="/dashboard" className="p-3 rounded-lg hover:bg-gray-800">
        <Layout className="w-5 h-5" />
      </Link>
      <Link href="/analytics" className="p-3 rounded-lg hover:bg-gray-800">
        <BarChart2 className="w-5 h-5" />
      </Link>
      <div className="flex-1" />
      <Link href="/settings" className="p-3 rounded-lg hover:bg-gray-800">
        <Settings className="w-5 h-5" />
      </Link>
    </aside>
  )
}

