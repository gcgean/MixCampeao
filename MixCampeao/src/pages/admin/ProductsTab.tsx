import Card from '@/components/Card'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Modal from '@/components/Modal'
import { apiFetch } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { useCallback, useEffect, useState } from 'react'
import type { Product } from './types'

export default function ProductsTab({ onProductsChanged }: { onProductsChanged?: (products: Product[]) => void }) {
  const { token } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ products: Product[] }>('/admin/products', { token })
      setProducts(data.products)
      onProductsChanged?.(data.products)
    } finally {
      setLoading(false)
    }
  }, [onProductsChanged, token])

  useEffect(() => {
    load()
  }, [load])

  function openForm(p?: Product) {
    setDraft(p ? { ...p } : {})
    setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const body = {
        id: draft.id,
        name: String(draft.name || '').trim(),
        unit: draft.unit ?? null,
      }
      await apiFetch('/admin/products', { method: 'POST', token, body })
      await load()
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Produtos</div>
        <Button size="sm" onClick={() => openForm()}>
          Novo
        </Button>
      </div>
      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-white/5" />
      ) : products.length === 0 ? (
        <div className="mt-3 text-sm text-white/60">Nenhum produto cadastrado.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr>
                <th className="py-2">Nome</th>
                <th className="py-2">Unidade</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-white/70">{p.unit || '—'}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="secondary" onClick={() => openForm(p)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={draft.id ? 'Editar produto' : 'Novo produto'} onClose={() => setModalOpen(false)}>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-white/60">Nome</div>
            <Input value={String(draft.name || '')} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Unidade</div>
            <Input value={String(draft.unit || '')} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="ex: un, kg, m" />
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
