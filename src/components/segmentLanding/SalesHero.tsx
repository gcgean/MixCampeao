import { Link } from 'react-router-dom'
import { BadgeCheck, Clock, CreditCard, Shield } from 'lucide-react'
import Button from '@/components/Button'
import Card from '@/components/Card'

export default function SalesHero({
  segmentName,
  teaser,
  price,
  primaryCta,
  primaryHref,
  onPrimaryClick,
  secondaryHref,
  purchased,
}: {
  segmentName: string
  teaser: string
  price: string
  primaryCta: string
  primaryHref?: string
  onPrimaryClick?: () => void
  secondaryHref: string
  purchased: boolean
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-white/5 to-white/5 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr,360px]">
        <div>
          <div className="text-xs text-white/70">Segmento</div>
          <div className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{segmentName}</div>
          <div className="mt-2 max-w-2xl text-sm text-white/70">{teaser}</div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              <div>
                <div className="text-sm font-medium">Lista enxuta e acionável</div>
                <div className="mt-0.5 text-xs text-white/60">O que comprar + quanto comprar, por seção.</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <CreditCard className="mt-0.5 h-4 w-4 text-violet-200" />
              <div>
                <div className="text-sm font-medium">Compra única</div>
                <div className="mt-0.5 text-xs text-white/60">Sem mensalidade. Acesso na sua conta.</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <Clock className="mt-0.5 h-4 w-4 text-sky-200" />
              <div>
                <div className="text-sm font-medium">Liberação automática</div>
                <div className="mt-0.5 text-xs text-white/60">Confirmou o Pix, liberou.</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <Shield className="mt-0.5 h-4 w-4 text-amber-200" />
              <div>
                <div className="text-sm font-medium">Garantia de acesso</div>
                <div className="mt-0.5 text-xs text-white/60">Se pagar e não liberar, eu resolvo.</div>
              </div>
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold">Desbloqueie agora</div>
          <div className="mt-1 text-sm text-white/60">Relatório completo + totais por seção.</div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60">Preço</div>
            <div className="mt-0.5 text-xl font-semibold">{price}</div>
            <div className="mt-1 text-xs text-white/60">Pagamento via Pix</div>
          </div>
          <div className="mt-3 grid gap-2">
            {primaryHref ? (
              <Link to={primaryHref}>
                <Button className="w-full">{primaryCta}</Button>
              </Link>
            ) : (
              <Button className="w-full" onClick={onPrimaryClick}>
                {primaryCta}
              </Button>
            )}
            <Link to={secondaryHref}>
              <Button variant="secondary" className="w-full">
                {purchased ? 'Abrir relatório' : 'Ver página do segmento'}
              </Button>
            </Link>
          </div>
          <div className="mt-3 text-xs text-white/60">Compra única. Acesso fica salvo em “Meus acessos”.</div>
        </Card>
      </div>
    </section>
  )
}

