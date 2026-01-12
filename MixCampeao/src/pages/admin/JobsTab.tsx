import Card from '@/components/Card'
import Button from '@/components/Button'
import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { useCallback, useEffect, useState } from 'react'
import type { ImportJob } from './types'

export default function JobsTab({ onNew }: { onNew: () => void }) {
  const { token } = useAuthStore()
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ jobs: ImportJob[] }>('/admin/import', { token })
      setJobs(data.jobs)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar importações')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Histórico de importações</div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={load}>
            Atualizar
          </Button>
          <Button size="sm" onClick={onNew}>
            Nova importação
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-white/5" />
      ) : error ? (
        <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">{error}</div>
      ) : jobs.length === 0 ? (
        <div className="mt-3 text-sm text-white/60">Sem importações.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr>
                <th className="py-2">Arquivo</th>
                <th className="py-2">Modo</th>
                <th className="py-2">Status</th>
                <th className="py-2">Linhas</th>
                <th className="py-2">Inseridos</th>
                <th className="py-2">Atualizados</th>
                <th className="py-2">Ignorados</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-white/10">
                  <td className="py-2 font-medium">{j.file_name}</td>
                  <td className="py-2 text-white/70">{j.mode}</td>
                  <td className="py-2 text-white/70">{j.status}</td>
                  <td className="py-2 text-white/70">{j.total_rows}</td>
                  <td className="py-2 text-white/70">{j.inserted}</td>
                  <td className="py-2 text-white/70">{j.updated}</td>
                  <td className="py-2 text-white/70">{j.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
