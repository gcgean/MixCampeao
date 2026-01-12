import Card from '@/components/Card'
import TabButton from './TabButton'
import SegmentsTab from './SegmentsTab'
import SectionsTab from './SectionsTab'
import ProductsTab from './ProductsTab'
import LinksTab from './LinksTab'
import ImportTab from './ImportTab'
import JobsTab from './JobsTab'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError } from '@/utils/api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Segment } from './types'

type SegmentRow = {
  id: string
  code: string
  slug: string
  name: string
  price_pix: number | string
  teaser: string | null
  active: boolean
}

export default function AdminPage() {
  const { token } = useAuthStore()
  const [tab, setTab] = useState<'segments' | 'sections' | 'products' | 'links' | 'import' | 'jobs'>('segments')

  const [segments, setSegments] = useState<Segment[]>([])
  const [segmentsLoading, setSegmentsLoading] = useState(true)
  const [segmentsError, setSegmentsError] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('')

  const selectedSegment = useMemo(
    () => segments.find((s) => s.id === selectedSegmentId) || null,
    [segments, selectedSegmentId],
  )

  const loadSegments = useCallback(async () => {
    setSegmentsLoading(true)
    setSegmentsError(null)
    try {
      const data = await apiFetch<{ segments: SegmentRow[] }>('/admin/segments', { token })
      const list: Segment[] = data.segments.map((s) => ({
        id: String(s.id),
        code: String(s.code),
        slug: String(s.slug),
        name: String(s.name),
        price_pix: Number(s.price_pix),
        teaser: s.teaser ?? null,
        active: Boolean(s.active),
      }))
      setSegments(list)
      setSelectedSegmentId((prev) => prev || list[0]?.id || '')
    } catch (err) {
      setSegmentsError(err instanceof ApiError ? err.message : 'Erro ao carregar segmentos')
    } finally {
      setSegmentsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadSegments()
  }, [loadSegments])

  function onSegmentDeleted(id: string) {
    if (selectedSegmentId === id) {
      const remaining = segments.filter((s) => s.id !== id)
      setSelectedSegmentId(remaining[0]?.id || '')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Admin</div>
        <div className="text-sm text-white/60">CRUD do catálogo e importação CSV/XLSX.</div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === 'segments'} onClick={() => setTab('segments')}>
            Segmentos
          </TabButton>
          <TabButton active={tab === 'sections'} onClick={() => setTab('sections')}>
            Seções
          </TabButton>
          <TabButton active={tab === 'products'} onClick={() => setTab('products')}>
            Produtos
          </TabButton>
          <TabButton active={tab === 'links'} onClick={() => setTab('links')}>
            Vínculos
          </TabButton>
          <TabButton active={tab === 'import'} onClick={() => setTab('import')}>
            Importar
          </TabButton>
          <TabButton active={tab === 'jobs'} onClick={() => setTab('jobs')}>
            Histórico
          </TabButton>
        </div>
      </Card>

      {tab !== 'segments' && (
        <Card className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs text-white/60">Segmento ativo</div>
              <div className="text-sm font-semibold">{selectedSegment?.name || '—'}</div>
            </div>
            <select
              className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={selectedSegmentId}
              onChange={(e) => setSelectedSegmentId(e.target.value)}
              disabled={segmentsLoading}
            >
              {segments.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0B1020]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {tab === 'segments' && (
        <SegmentsTab
          segments={segments}
          loading={segmentsLoading}
          error={segmentsError}
          onReload={loadSegments}
          onDeleted={onSegmentDeleted}
        />
      )}
      {tab === 'sections' && <SectionsTab segmentId={selectedSegmentId} />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'links' && <LinksTab segmentId={selectedSegmentId} />}
      {tab === 'import' && <ImportTab onDone={() => setTab('jobs')} />}
      {tab === 'jobs' && <JobsTab onNew={() => setTab('import')} />}
    </div>
  )
}
