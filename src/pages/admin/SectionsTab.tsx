import Card from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Modal from '@/components/Modal'
import { apiFetch } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import type { Section } from './types'

export default function SectionsTab({ segmentId }: { segmentId: string }) {
  const { token } = useAuthStore()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Partial<Section>>({ sort_order: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!segmentId) {
      setSections([])
      return
    }
    let alive = true
    async function load() {
      setLoading(true)
      try {
        const data = await apiFetch<{ sections: Section[] }>(`/admin/segments/${segmentId}/sections`, { token })
        if (!alive) return
        setSections(data.sections)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [segmentId, token])

  function openForm(sec?: Section) {
    setDraft(sec ? { ...sec } : { segment_id: segmentId, sort_order: 0 })
    setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const body = {
        id: draft.id,
        segment_id: segmentId,
        name: String(draft.name || '').trim(),
        sort_order: Number(draft.sort_order || 0),
      }
      await apiFetch('/admin/sections', { method: 'POST', token, body })
      const data = await apiFetch<{ sections: Section[] }>(`/admin/segments/${segmentId}/sections`, { token })
      setSections(data.sections)
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Seções</div>
        <Button size="sm" onClick={() => openForm()} disabled={!segmentId}>
          Nova
        </Button>
      </div>
      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-white/5" />
      ) : sections.length === 0 ? (
        <div className="mt-3 text-sm text-white/60">Nenhuma seção cadastrada.</div>
      ) : (
        <div className="mt-3 grid gap-2">
          {sections.map((sec) => (
            <div key={sec.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-medium">{sec.name}</div>
                <div className="text-xs text-white/60">Ordem: {sec.sort_order}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openForm(sec)}>
                Editar
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={draft.id ? 'Editar seção' : 'Nova seção'} onClose={() => setModalOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-white/60">Nome</div>
            <Input value={String(draft.name || '')} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Ordem</div>
            <Input
              value={String(draft.sort_order ?? 0)}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              inputMode="numeric"
            />
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
