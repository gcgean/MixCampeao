import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export default function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[#111A33] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">{title}</div>
          <button
            className={cn('rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white')}
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

