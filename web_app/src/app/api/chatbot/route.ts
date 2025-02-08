import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export async function POST(req: NextRequest) {
  const { messages, audioUrl } = await req.json()

  const scriptPath = path.join(process.cwd(), "python", "chatbot.py")

  return new Promise((resolve) => {
    const pythonProcess = spawn("python", [scriptPath])

    let result = ""

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python Error: ${data}`)
    })

    pythonProcess.on("close", (code) => {
      console.log(`Python process exited with code ${code}`)
      resolve(NextResponse.json({ response: result.trim() }))
    })

    pythonProcess.stdin.write(JSON.stringify({ messages, audioUrl }))
    pythonProcess.stdin.end()
  })
}

