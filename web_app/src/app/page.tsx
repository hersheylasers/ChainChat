"use client"

import React from 'react'
import { ModeToggle } from '@/components/ModeToggle'

export default function Page() {
  return (
    <div className='grid gap-3 p-4'>
      <ModeToggle />
      <div>
        Hello, world!
      </div>
    </div>
  )
}
