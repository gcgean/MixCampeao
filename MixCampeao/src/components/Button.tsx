import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export default function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'bg-violet-600 text-white hover:bg-violet-500',
    secondary: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
    ghost: 'text-white hover:bg-white/10',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }
  const sizes: Record<string, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
  }
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
}

