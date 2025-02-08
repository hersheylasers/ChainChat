"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StrategyList } from "./components/strategy-list"
import { StrategyPerformance } from "./components/strategy-performance"
import { CreateStrategyForm } from "./components/create-strategy-form"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { ChatbotModal } from "./components/chatbot-modal"

export default function AIStrategiesPage() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)

  return (
    <div className="min-h-screen relative">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">AI Trading Strategies</h1>
        <div className="grid gap-8 grid-cols-1 xl:grid-cols-3">
          <Card className="xl:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Active Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyList />
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Create New Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateStrategyForm />
            </CardContent>
          </Card>
          <Card className="xl:col-span-3 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Strategy Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <StrategyPerformance />
            </CardContent>
          </Card>
        </div>
      </main>
      <Button className="fixed bottom-4 right-4 rounded-full p-3" onClick={() => setIsChatbotOpen(true)}>
        <MessageCircle size={24} />
      </Button>
      <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
      <Toaster />
    </div>
  )
}

