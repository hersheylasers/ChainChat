"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CreateStrategyForm() {
  const [name, setName] = useState("")
  const [asset, setAsset] = useState("")
  const [type, setType] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle strategy creation logic here
    console.log("Creating strategy:", { name, asset, type })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Strategy Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-gray-800 border-gray-700 text-white"
      />
      <Select onValueChange={setAsset}>
        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
          <SelectValue placeholder="Select Asset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BTC/USD">BTC/USD</SelectItem>
          <SelectItem value="ETH/USD">ETH/USD</SelectItem>
          <SelectItem value="SOL/USD">SOL/USD</SelectItem>
        </SelectContent>
      </Select>
      <Select onValueChange={setType}>
        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
          <SelectValue placeholder="Strategy Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="momentum">Momentum</SelectItem>
          <SelectItem value="trend">Trend Following</SelectItem>
          <SelectItem value="meanReversion">Mean Reversion</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" className="w-full">
        Create Strategy
      </Button>
    </form>
  )
}

