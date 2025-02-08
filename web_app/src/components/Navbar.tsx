"use client"

import React from 'react'
import Link from 'next/link'
import { ModeToggle } from './ModeToggle'
import Login from '@/components/ui/auth/auth'

export default function Navbar() {

    return (
        <div className='sticky top-0 z-50 bg-background shadow-md'>
            <nav className="flex items-center py-2 flex-wrap pl-4 text-fontColor tracking-wider">
                <Link href="/"><span className="p-2 font-handjet mr-4 inline-flex items-center text-4xl cursor-pointer font-base">ChainChat
                </span></Link>

                <div className="top-navbar w-full lg:inline-flex font-orbitron lg:flex-grow lg:w-auto" >
                    <div className="lg:inline-flex lg:flex-row lg:ml-auto lg:w-auto w-full text-xl md:text-lg lg:items-center items-start flex flex-col lg:h-auto space-x-2 mr-12" >

                        <Link href="/">
                            <span className="lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white">Home</span>
                        </Link>

                        <Link href="/markets">
                            <span className="lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white">Markets</span>
                        </Link>

                        {/* <Link href="/dashboard">
                            <span className="lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white">Trading Dashboard</span>
                        </Link> */}

                        <Link href="/portfolio">
                            <span className="lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white">Portfolio</span>
                        </Link>

                        <Link href="/ai-agent-strategies">
                            <span className="lg:inline-flex lg:w-auto w-full px-3 py-2 rounded items-center justify-center dark:hover:bg-navHover hover:bg-primary cursor-pointer hover:text-white">AI Agents</span>
                        </Link>

                        {/* <Login/> */}

                        <ModeToggle />
                    </div>
                </div>
            </nav>
        </div>
    );
}