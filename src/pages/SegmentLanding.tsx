import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { apiFetch, ApiError } from '@/utils/api'
import { formatBRL } from '@/utils/format'
import { useAuthStore } from '@/stores/authStore'
import SalesHero from '@/components/segmentLanding/SalesHero'
import PixSidebar from '@/components/segmentLanding/PixSidebar'
import SalesFaq from '@/components/segmentLanding/SalesFaq'
import StickySegmentCta from '@/components/segmentLanding/StickySegmentCta'

type Segment = {
  id: string
  code: string
  slug: string
  name: string
  price_pix: number
  teaser: string | null
  active: boolean
}

type PreviewSection = {
  name: string
  items: Array<{
    product: string
    unit: string | null
    qty_ideal_7: number
    qty_ideal_15: number
    qty_ideal_30: number
    qty_ideal_60: number
    qty_ideal_90: number
    avg_price: number
    line_total: number
    note: string | null
  }>
}

export default function SegmentLanding() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuthStore()

  const [segment, setSegment] = useState<Segment | null>(null)
  const [preview, setPreview] = useState<PreviewSection[]>([])
  const [purchased, setPurchased] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [purchaseId, setPurchaseId] = useState<string | null>(null)
  const [copyPaste, setCopyPaste] = useState<string | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [payStatus, setPayStatus] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  const pollingRef = useRef<number | null>(null)
  const checkoutAnchorRef = useRef<HTMLDivElement | null>(null)

  const expiresInText = useMemo(() => {
    if (!expiresAt) return null
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return 'expirado'
    const min = Math.ceil(ms / 60000)
    return `${min} min`
  }, [expiresAt])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ segment: Segment; preview: PreviewSection[]; purchased: boolean }>(`/segments/${slug}`, { token })
        if (!alive) return
        setSegment(data.segment)
        setPreview(data.preview)
        setPurchased(Boolean(data.purchased))
        document.title = `${data.segment.name} — Mix Campeão`
      } catch (err) {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar segmento')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [slug, token])

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  async function startPayment() {
    if (!user || !token) {
      navigate('/entrar', { state: { from: `/s/${slug}` } })
      return
    }
    setPayError(null)
    setPayStatus(null)
    try {
      const data = await apiFetch<{
        purchaseId: string
        status: string
        amount: number
        copyPaste: string
        qrCodeDataUrl: string
        expiresAt: string
      }>('/payments/pix/create', { method: 'POST', token, body: { segmentSlug: slug } })

      setPurchaseId(data.purchaseId)
      setPayStatus(data.status)
      setCopyPaste(data.copyPaste)
      setQrCodeDataUrl(data.qrCodeDataUrl)
      setExpiresAt(data.expiresAt)

      window.setTimeout(() => {
        checkoutAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)

      if (pollingRef.current) window.clearInterval(pollingRef.current)
      pollingRef.current = window.setInterval(async () => {
        try {
          const status = await apiFetch<{ status: string }>(`/payments/${data.purchaseId}`, { token })
          setPayStatus(status.status)
          if (status.status === 'PAID') {
            if (pollingRef.current) window.clearInterval(pollingRef.current)
            pollingRef.current = null
            setPurchased(true)
          }
        } catch {
          setPayStatus('PENDING')
        }
      }, 3000)
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'Erro ao criar cobrança')
    }
  }

  async function copyPix() {
    if (!copyPaste) return
    try {
      await navigator.clipboard.writeText(copyPaste)
    } catch {
      return
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {loading ? (
        <Card className="h-28 animate-pulse" />
      ) : error || !segment ? (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-sm">{error || 'Segmento não encontrado'}</Card>
      ) : (
        <>
          <SalesHero
            segmentName={segment.name}
            teaser={segment.teaser || 'Receba uma lista de compra enxuta com quantidade ideal e valor médio por seção.'}
            price={formatBRL(segment.price_pix)}
            purchased={purchased}
            primaryCta={purchased ? 'Abrir relatório completo' : user ? 'Desbloquear por Pix' : 'Entrar para desbloquear'}
            primaryHref={purchased ? `/segmentos/${segment.slug}` : !user ? '/entrar' : undefined}
            onPrimaryClick={purchased || !user ? undefined : startPayment}
            secondaryHref={`/segmentos/${segment.slug}`}
          />

          <section className="grid gap-4 lg:grid-cols-[360px,1fr]">
            <div>
              <div ref={checkoutAnchorRef} />
              <PixSidebar
                purchased={purchased}
                segmentHref={`/segmentos/${segment.slug}`}
                isLoggedIn={Boolean(user)}
                onStartPayment={startPayment}
                payError={payError}
                purchaseId={purchaseId}
                payStatus={payStatus}
                qrCodeDataUrl={qrCodeDataUrl}
                copyPaste={copyPaste}
                expiresInText={expiresInText}
                onCopyPix={copyPix}
              />
            </div>

            <div className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-semibold">Amostra real do relatório</div>
                <div className="mt-1 text-sm text-white/60">Top 3 por seção para você decidir com confiança.</div>
                {preview.length === 0 ? (
                  <div className="mt-3 text-sm text-white/60">Sem dados de prévia para este segmento.</div>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {preview.map((sec) => (
                      <div key={sec.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs font-semibold text-white/80">{sec.name}</div>
                        <ol className="mt-2 space-y-2">
                          {sec.items.map((it, idx) => (
                            <li key={`${it.product}-${idx}`} className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm">{it.product}</div>
                                <div className="text-xs text-white/60">
                                  Qtd (30 dias): {it.qty_ideal_30} {it.unit || ''} · Médio: {formatBRL(it.avg_price)}
                                </div>
                              </div>
                              <div className="text-xs font-semibold text-white/80">{formatBRL(it.line_total)}</div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="text-sm font-semibold">O que você recebe</div>
                <div className="mt-1 text-sm text-white/60">Tudo pronto para você comprar rápido e com margem.</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">Itens organizados por seção</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">Quantidade ideal por item</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">Valor médio e total estimado</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">Acesso dentro da sua conta</div>
                </div>
                <div className="mt-3 flex gap-2">
                  {purchased ? (
                    <Link to={`/segmentos/${segment.slug}`}>
                      <Button>Ir para o relatório</Button>
                    </Link>
                  ) : !user ? (
                    <Link to="/entrar" state={{ from: `/s/${segment.slug}` }}>
                      <Button>Entrar para desbloquear</Button>
                    </Link>
                  ) : (
                    <Button onClick={startPayment}>Desbloquear por Pix</Button>
                  )}
                  <Link to="/meus-acessos">
                    <Button variant="secondary">Ver meus acessos</Button>
                  </Link>
                </div>
              </Card>

              <SalesFaq segmentName={segment.name} />
            </div>
          </section>

          <StickySegmentCta
            visible={!loading && Boolean(segment)}
            price={formatBRL(segment.price_pix)}
            primaryCta={purchased ? 'Abrir relatório' : user ? 'Desbloquear por Pix' : 'Entrar'}
            primaryHref={purchased ? `/segmentos/${segment.slug}` : !user ? '/entrar' : undefined}
            onPrimaryClick={purchased || !user ? undefined : startPayment}
          />
        </>
      )}
    </div>
  )
}
