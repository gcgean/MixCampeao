import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { apiFetch, ApiError } from '@/utils/api'
import { formatBRL } from '@/utils/format'
import { useAuthStore } from '@/stores/authStore'

type Segment = {
  id: string
  code: string
  slug: string
  name: string
  price_pix: number
  teaser: string | null
  active: boolean
  purchased?: boolean
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

export default function Home() {
  const { token } = useAuthStore()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [preview, setPreview] = useState<PreviewSection[] | null>(null)
  const [previewSegmentName, setPreviewSegmentName] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const activeSegments = useMemo(() => segments.filter((s) => s.active), [segments])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ segments: Segment[] }>('/segments', { token })
        if (!alive) return
        setSegments(data.segments)
      } catch (err) {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar segmentos')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (selectedSlug) return
    const first = activeSegments[0]?.slug
    if (first) setSelectedSlug(first)
  }, [activeSegments, selectedSlug])

  useEffect(() => {
    if (!selectedSlug) return
    let alive = true
    async function loadPreview() {
      setPreviewLoading(true)
      try {
        const data = await apiFetch<{ segment: { name: string }; preview: PreviewSection[] }>(`/segments/${selectedSlug}`, { token })
        if (!alive) return
        setPreview(data.preview)
        setPreviewSegmentName(data.segment.name)
      } catch {
        if (!alive) return
        setPreview(null)
        setPreviewSegmentName('')
      } finally {
        if (alive) setPreviewLoading(false)
      }
    }
    loadPreview()
    return () => {
      alive = false
    }
  }, [selectedSlug, token])

  return (
    <div className="space-y-6">
      <section>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5">
          <div className="text-xl font-semibold">Compra única por segmento. Liberação automática via Pix.</div>
          <div className="mt-2 max-w-2xl text-sm text-white/70">
            Veja a prévia Top 3 e destrave o relatório completo com quantidade ideal e valor médio por seção.
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Segmentos</div>
            <div className="text-xs text-white/60">Escolha um segmento para ver a prévia e comprar.</div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="h-28 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-sm">{error}</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSegments.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="mt-1 text-xs text-white/60">{s.teaser || 'Relatório completo por seção.'}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatBRL(s.price_pix)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-white/60">/{s.slug}</div>
                  <Link to={s.purchased ? `/segmentos/${s.slug}` : `/s/${s.slug}`}>
                    <Button size="sm" variant={s.purchased ? 'secondary' : 'primary'}>
                      {s.purchased ? 'Ver relatório' : 'Ver prévia'}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Prévia Top 3</div>
            <div className="text-xs text-white/60">Selecione um segmento para ver os 3 itens mais relevantes por seção.</div>
          </div>
          <select
            className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
          >
            {activeSegments.map((s) => (
              <option key={s.id} value={s.slug} className="bg-[#0B1020]">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <Card className="p-4">
          {previewLoading ? (
            <div className="h-28 animate-pulse rounded-md bg-white/5" />
          ) : !preview ? (
            <div className="text-sm text-white/60">Selecione um segmento.</div>
          ) : preview.length === 0 ? (
            <div className="text-sm text-white/60">Sem dados de prévia para este segmento.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{previewSegmentName}</div>
                <Link to={`/segmentos/${selectedSlug}`}>
                  <Button size="sm" variant="secondary">
                    Abrir segmento
                  </Button>
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {preview.map((sec) => (
                  <div key={sec.name} className="rounded-lg border border-white/10 bg-white/5 p-3">
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
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
