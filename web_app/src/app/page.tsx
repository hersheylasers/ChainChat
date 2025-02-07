"use client"

import React from 'react'
import { ModeToggle } from '@/components/ModeToggle'
import { ThemeProvider } from '@/components/theme-provider'
import Login from '@/components/ui/auth/auth'

export default function Page() {
  return (
    <div className='grid gap-3 p-4 '>
      <div className='flex justify-end items-center'>
      <Login/>
      <ModeToggle />
      </div>

      <div>

        Hello, world!
      </div>


    </div>
  )
}
