import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500',
        className,
      )}
      {...props}
    />
  )
}

