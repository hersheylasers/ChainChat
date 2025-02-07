import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export default function MaxWidthWrapper({ className, children }: { className?: string, children: ReactNode }) {
    return (
        <div className={cn('mx-auto w-full px-2.5 md:px-12', className)}>
            {children}
        </div>
    )
}