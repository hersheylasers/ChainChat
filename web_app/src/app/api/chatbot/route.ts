// app/api/chatbot/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { messages, audioUrl } = await req.json()
    
    const scriptPath = path.join(process.cwd(), "python", "chatbot.py")
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python", [scriptPath], {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          MODE: 'chat'
        }
      })
      
      let result = ""
      let error = ""
      
      pythonProcess.stdout.on("data", (data) => {
        const output = data.toString()
        console.log('Python output:', output)
        result += output
      })
      
      pythonProcess.stderr.on("data", (data) => {
        const errorOutput = data.toString()
        console.error('Python error:', errorOutput)
        error += errorOutput
      })
      
      pythonProcess.on("close", (code) => {
        console.log(`Python process exited with code ${code}`)
        if (code !== 0) {
          reject(NextResponse.json(
            { error: error || 'Python process failed' },
            { status: 500 }
          ))
        } else {
          try {
            const responseLines = result.split('\n')
            const actualResponse = responseLines
              .filter(line => !line.includes('-------------------'))
              .join('\n')
              .trim()
            
            resolve(NextResponse.json({ response: actualResponse }))
          } catch (parseError) {
            reject(NextResponse.json(
              { error: 'Failed to parse Python response' },
              { status: 500 }
            ))
          }
        }
      })
      
      pythonProcess.on("error", (err) => {
        console.error('Python process error:', err)
        reject(NextResponse.json(
          { error: err.message },
          { status: 500 }
        ))
      })

      const input = JSON.stringify({
        messages,
        audioUrl,
        mode: 'chat'
      }) + '\n'
      
      pythonProcess.stdin.write(input)
      pythonProcess.stdin.end()
    })
  } catch (error) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}