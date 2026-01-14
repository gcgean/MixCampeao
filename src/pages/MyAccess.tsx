import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { formatBRL } from '@/utils/format'

type PurchasedSegment = {
  id: string
  code: string
  slug: string
  name: string
  price_pix: number
  paid_at: string
}

export default function MyAccess() {
  const navigate = useNavigate()
  const { token, user, hydrated } = useAuthStore()
  const [segments, setSegments] = useState<PurchasedSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    if (!user || !token) {
      navigate('/entrar', { state: { from: '/meus-acessos' } })
      return
    }
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ segments: PurchasedSegment[] }>('/me/segments', { token })
        if (!alive) return
        setSegments(data.segments)
      } catch (err) {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [hydrated, token, user, navigate])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Meus acessos</div>
        <div className="text-sm text-white/60">Seus segmentos comprados ficam disponíveis permanentemente.</div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="h-24 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-sm">{error}</Card>
      ) : segments.length === 0 ? (
        <Card className="p-4">
          <div className="text-sm text-white/60">Você ainda não comprou nenhum segmento.</div>
          <div className="mt-3">
            <Link to="/">
              <Button size="sm">Ver segmentos</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="mt-1 text-xs text-white/60">Pago em {new Date(s.paid_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="text-sm font-semibold">{formatBRL(s.price_pix)}</div>
              </div>
              <div className="mt-3 flex justify-end">
                <Link to={`/segmentos/${s.slug}`}>
                  <Button size="sm" variant="secondary">
                    Abrir
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
