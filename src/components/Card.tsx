import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/5',
        className,
      )}
      {...props}
    />
  )
}

