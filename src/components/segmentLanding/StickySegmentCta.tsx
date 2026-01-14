import Button from '@/components/Button'
import { Link } from 'react-router-dom'

export default function StickySegmentCta({
  visible,
  price,
  primaryCta,
  primaryHref,
  onPrimaryClick,
}: {
  visible: boolean
  price: string
  primaryCta: string
  primaryHref?: string
  onPrimaryClick?: () => void
}) {
  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B1020]/90 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] text-white/60">Compra única</div>
          <div className="truncate text-sm font-semibold">{price}</div>
        </div>
        <div className="flex-1">
          {primaryHref ? (
            <Link to={primaryHref}>
              <Button className="w-full">{primaryCta}</Button>
            </Link>
          ) : (
            <Button className="w-full" onClick={onPrimaryClick}>
              {primaryCta}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

