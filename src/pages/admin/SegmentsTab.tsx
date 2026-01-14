import Card from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Modal from '@/components/Modal'
import { apiFetch, ApiError } from '@/utils/api'
import { formatBRL } from '@/utils/format'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'
import type { Segment } from './types'

export default function SegmentsTab({
  segments,
  loading,
  error,
  onReload,
  onDeleted,
}: {
  segments: Segment[]
  loading: boolean
  error: string | null
  onReload: () => Promise<void>
  onDeleted: (deletedId: string) => void
}) {
  const { token } = useAuthStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Partial<Segment>>({ active: true, price_pix: 0 })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openForm(seg?: Segment) {
    setSaveError(null)
    setDraft(seg ? { ...seg } : { active: true, price_pix: 0 })
    setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        id: draft.id,
        code: String(draft.code || '').trim(),
        slug: String(draft.slug || '').trim(),
        name: String(draft.name || '').trim(),
        price_pix: Number(draft.price_pix || 0),
        teaser: draft.teaser ?? null,
        active: Boolean(draft.active),
      }
      await apiFetch('/admin/segments', { method: 'POST', token, body })
      await onReload()
      setModalOpen(false)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    await apiFetch(`/admin/segments/${id}`, { method: 'DELETE', token })
    await onReload()
    onDeleted(id)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Segmentos</div>
        <Button size="sm" onClick={() => openForm()}>
          Novo
        </Button>
      </div>
      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-white/5" />
      ) : error ? (
        <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">{error}</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr>
                <th className="py-2">Nome</th>
                <th className="py-2">Slug</th>
                <th className="py-2">Preço</th>
                <th className="py-2">Ativo</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.id} className="border-t border-white/10">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-white/70">{s.slug}</td>
                  <td className="py-2 text-white/70">{formatBRL(s.price_pix)}</td>
                  <td className="py-2 text-white/70">{s.active ? 'Sim' : 'Não'}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openForm(s)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(s.id)}>
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

      <Modal open={modalOpen} title={draft.id ? 'Editar segmento' : 'Novo segmento'} onClose={() => setModalOpen(false)}>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-white/60">Código</div>
              <Input value={String(draft.code || '')} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Slug</div>
              <Input value={String(draft.slug || '')} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Nome</div>
            <Input value={String(draft.name || '')} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Preço Pix</div>
            <Input
              value={String(draft.price_pix ?? 0)}
              onChange={(e) => setDraft({ ...draft, price_pix: Number(e.target.value) })}
              inputMode="decimal"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Teaser</div>
            <Input value={String(draft.teaser || '')} onChange={(e) => setDraft({ ...draft, teaser: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={Boolean(draft.active)} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Ativo
          </label>
          {saveError && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">{saveError}</div>}
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

