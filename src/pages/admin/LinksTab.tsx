import Card from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Modal from '@/components/Modal'
import { apiFetch } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { formatBRL } from '@/utils/format'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LinkItem, Product, Section } from './types'

type DraftLink = {
  id?: string
  section_id: string | null
  product_id: string
  qty_ideal_7: number
  qty_ideal_15: number
  qty_ideal_30: number
  qty_ideal_60: number
  qty_ideal_90: number
  avg_price: number
  note: string
}

export default function LinksTab({ segmentId }: { segmentId: string }) {
  const { token } = useAuthStore()
  const [sections, setSections] = useState<Section[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<DraftLink>({
    section_id: null,
    product_id: '',
    qty_ideal_7: 0,
    qty_ideal_15: 0,
    qty_ideal_30: 0,
    qty_ideal_60: 0,
    qty_ideal_90: 0,
    avg_price: 0,
    note: '',
  })
  const [saving, setSaving] = useState(false)

  const sectionOptions = useMemo(() => sections, [sections])

  const loadAll = useCallback(async () => {
    if (!segmentId) {
      setSections([])
      setItems([])
      return
    }
    setLoading(true)
    try {
      const [sec, prod, links] = await Promise.all([
        apiFetch<{ sections: Section[] }>(`/admin/segments/${segmentId}/sections`, { token }),
        apiFetch<{ products: Product[] }>('/admin/products', { token }),
        apiFetch<{ items: LinkItem[] }>(`/admin/segment-products?segmentId=${segmentId}`, { token }),
      ])
      setSections(sec.sections)
      setProducts(prod.products)
      setItems(links.items)
    } finally {
      setLoading(false)
    }
  }, [segmentId, token])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  function openForm(item?: LinkItem) {
    setDraft(
      item
        ? {
            id: item.id,
            section_id: item.section_id,
            product_id: item.product_id,
            qty_ideal_7: Number(item.qty_ideal_7),
            qty_ideal_15: Number(item.qty_ideal_15),
            qty_ideal_30: Number(item.qty_ideal_30),
            qty_ideal_60: Number(item.qty_ideal_60),
            qty_ideal_90: Number(item.qty_ideal_90),
            avg_price: Number(item.avg_price),
            note: item.note || '',
          }
        : {
            section_id: null,
            product_id: '',
            qty_ideal_7: 0,
            qty_ideal_15: 0,
            qty_ideal_30: 0,
            qty_ideal_60: 0,
            qty_ideal_90: 0,
            avg_price: 0,
            note: '',
          },
    )
    setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const body = {
        id: draft.id,
        segment_id: segmentId,
        section_id: draft.section_id || null,
        product_id: draft.product_id,
        qty_ideal_7: Number(draft.qty_ideal_7 || 0),
        qty_ideal_15: Number(draft.qty_ideal_15 || 0),
        qty_ideal_30: Number(draft.qty_ideal_30 || 0),
        qty_ideal_60: Number(draft.qty_ideal_60 || 0),
        qty_ideal_90: Number(draft.qty_ideal_90 || 0),
        avg_price: Number(draft.avg_price || 0),
        note: draft.note ? String(draft.note) : null,
      }
      await apiFetch('/admin/segment-products', { method: 'POST', token, body })
      await loadAll()
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    await apiFetch(`/admin/segment-products/${id}`, { method: 'DELETE', token })
    await loadAll()
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Vínculos (segmento ↔ produto)</div>
        <Button size="sm" onClick={() => openForm()} disabled={!segmentId}>
          Novo
        </Button>
      </div>
      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-white/5" />
      ) : items.length === 0 ? (
        <div className="mt-3 text-sm text-white/60">Nenhum vínculo para este segmento.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr>
                <th className="py-2">Seção</th>
                <th className="py-2">Produto</th>
                <th className="py-2">Qtd (30d)</th>
                <th className="py-2">Médio</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-white/10">
                  <td className="py-2 text-white/70">{it.section_name || 'Sem seção'}</td>
                  <td className="py-2 font-medium">{it.product_name}</td>
                  <td className="py-2 text-white/70">{Number(it.qty_ideal_30)} {it.unit || ''}</td>
                  <td className="py-2 text-white/70">{formatBRL(Number(it.avg_price))}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openForm(it)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(it.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={draft.id ? 'Editar vínculo' : 'Novo vínculo'} onClose={() => setModalOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-white/60">Seção (opcional)</div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={draft.section_id || ''}
              onChange={(e) => setDraft({ ...draft, section_id: e.target.value || null })}
            >
              <option value="" className="bg-[#0B1020]">Sem seção</option>
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0B1020]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Produto</div>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={draft.product_id || ''}
              onChange={(e) => setDraft({ ...draft, product_id: e.target.value })}
            >
              <option value="" className="bg-[#0B1020]">Selecione…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0B1020]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-white/60">Qtd (7 dias)</div>
              <Input value={String(draft.qty_ideal_7 ?? 0)} onChange={(e) => setDraft({ ...draft, qty_ideal_7: Number(e.target.value) })} inputMode="decimal" />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Qtd (15 dias)</div>
              <Input value={String(draft.qty_ideal_15 ?? 0)} onChange={(e) => setDraft({ ...draft, qty_ideal_15: Number(e.target.value) })} inputMode="decimal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-white/60">Qtd (30 dias)</div>
              <Input value={String(draft.qty_ideal_30 ?? 0)} onChange={(e) => setDraft({ ...draft, qty_ideal_30: Number(e.target.value) })} inputMode="decimal" />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Qtd (60 dias)</div>
              <Input value={String(draft.qty_ideal_60 ?? 0)} onChange={(e) => setDraft({ ...draft, qty_ideal_60: Number(e.target.value) })} inputMode="decimal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-white/60">Qtd (90 dias)</div>
              <Input value={String(draft.qty_ideal_90 ?? 0)} onChange={(e) => setDraft({ ...draft, qty_ideal_90: Number(e.target.value) })} inputMode="decimal" />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Valor médio</div>
              <Input value={String(draft.avg_price ?? 0)} onChange={(e) => setDraft({ ...draft, avg_price: Number(e.target.value) })} inputMode="decimal" />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Observação</div>
            <Input value={String(draft.note || '')} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setModalOpen(false)} type="button">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
