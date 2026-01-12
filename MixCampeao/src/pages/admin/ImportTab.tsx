import Card from '@/components/Card'
import Button from '@/components/Button'
import { uploadMultipart, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'
import * as XLSX from 'xlsx'

type ParsedRow = Record<string, unknown>

type ValidationResult = {
  columns: string[]
  previewRows: ParsedRow[]
  totalRows: number
  missingRequired: string[]
  rowErrors: Array<{ row: number; message: string }>
}

const REQUIRED_COLS = ['COD_SEGMENTO', 'PRODUTO', 'VALOR_MEDIO']
const QTY_COLS = ['QTD_IDEAL', 'QTD_30', 'QTD_7', 'QTD_15', 'QTD_60', 'QTD_90']
const OPTIONAL_COLS = ['SECAO', 'UNIDADE', 'OBS']

function normalizeKey(key: unknown): string {
  return String(key ?? '').trim().toUpperCase()
}

function parsePtNumber(val: unknown): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null
  const raw = String(val ?? '').trim()
  if (!raw) return null
  let s = raw.replace(/\s+/g, '')
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const ext = file.name.toLowerCase()
  let workbook: XLSX.WorkBook
  if (ext.endsWith('.csv')) {
    const text = await file.text()
    workbook = XLSX.read(text, { type: 'string' })
  } else {
    const buf = await file.arrayBuffer()
    workbook = XLSX.read(buf, { type: 'array' })
  }
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as ParsedRow[]
}

function normalizeRows(rows: ParsedRow[]): ParsedRow[] {
  return rows.map((r) => {
    const out: ParsedRow = {}
    for (const [k, v] of Object.entries(r)) {
      out[normalizeKey(k)] = v
    }
    return out
  })
}

function validateRows(rows: ParsedRow[]): ValidationResult {
  const columns = Object.keys(rows[0] || {})
  const missingRequired = REQUIRED_COLS.filter((c) => !columns.includes(c))
  if (!columns.includes('QTD_IDEAL') && !columns.includes('QTD_30')) {
    missingRequired.push('QTD_IDEAL ou QTD_30')
  }

  const rowErrors: Array<{ row: number; message: string }> = []
  const maxErrors = 20
  const maxValidateRows = 200

  for (let i = 0; i < Math.min(rows.length, maxValidateRows); i++) {
    if (rowErrors.length >= maxErrors) break
    const rowNumber = i + 2
    const r = rows[i]
    const cod = String(r.COD_SEGMENTO ?? '').trim()
    const produto = String(r.PRODUTO ?? '').trim()
    const qtdBase30 = parsePtNumber((r.QTD_30 ?? r.QTD_IDEAL) as unknown)
    const valor = parsePtNumber(r.VALOR_MEDIO)
    if (!cod) rowErrors.push({ row: rowNumber, message: 'COD_SEGMENTO vazio' })
    if (!produto) rowErrors.push({ row: rowNumber, message: 'PRODUTO vazio' })
    if (qtdBase30 === null || qtdBase30 < 0) rowErrors.push({ row: rowNumber, message: 'QTD_IDEAL ou QTD_30 inválido' })
    if (columns.includes('QTD_7')) {
      const q = parsePtNumber(r.QTD_7)
      if (q === null || q < 0) rowErrors.push({ row: rowNumber, message: 'QTD_7 inválido' })
    }
    if (columns.includes('QTD_15')) {
      const q = parsePtNumber(r.QTD_15)
      if (q === null || q < 0) rowErrors.push({ row: rowNumber, message: 'QTD_15 inválido' })
    }
    if (columns.includes('QTD_60')) {
      const q = parsePtNumber(r.QTD_60)
      if (q === null || q < 0) rowErrors.push({ row: rowNumber, message: 'QTD_60 inválido' })
    }
    if (columns.includes('QTD_90')) {
      const q = parsePtNumber(r.QTD_90)
      if (q === null || q < 0) rowErrors.push({ row: rowNumber, message: 'QTD_90 inválido' })
    }
    if (valor === null || valor < 0) rowErrors.push({ row: rowNumber, message: 'VALOR_MEDIO inválido' })
  }

  return {
    columns,
    totalRows: rows.length,
    previewRows: rows.slice(0, 10),
    missingRequired,
    rowErrors,
  }
}

function extractBackendErrors(details: unknown): Array<{ row: number; message: string }> | null {
  if (typeof details !== 'object' || details === null) return null
  const errors = (details as { errors?: unknown }).errors
  if (!Array.isArray(errors)) return null
  const out: Array<{ row: number; message: string }> = []
  for (const e of errors) {
    if (typeof e !== 'object' || e === null) continue
    const row = Number((e as { row?: unknown }).row)
    const message = String((e as { message?: unknown }).message ?? '')
    if (Number.isFinite(row) && message) out.push({ row, message })
  }
  return out.length ? out : null
}

export default function ImportTab({ onDone }: { onDone: () => void }) {
  const { token } = useAuthStore()
  const [mode, setMode] = useState<'UPSERT' | 'INSERT' | 'REPLACE'>('UPSERT')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [backendErrors, setBackendErrors] = useState<Array<{ row: number; message: string }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const qtyMeta = (() => {
    if (!validation) return null
    const cols = new Set(validation.columns)
    const base = cols.has('QTD_30') ? 'QTD_30' : cols.has('QTD_IDEAL') ? 'QTD_IDEAL' : null
    const extra = ['QTD_7', 'QTD_15', 'QTD_60', 'QTD_90'].filter((c) => cols.has(c))
    return { base, extra }
  })()

  async function onPickFile(f: File | null) {
    setFile(f)
    setError(null)
    setBackendErrors(null)
    setValidation(null)
    if (!f) return
    setParsing(true)
    try {
      const raw = await parseSpreadsheet(f)
      const normalized = normalizeRows(raw)
      setValidation(validateRows(normalized))
    } catch {
      setError('Não foi possível ler o arquivo. Use CSV ou XLSX.')
    } finally {
      setParsing(false)
    }
  }

  async function runImport() {
    setError(null)
    setBackendErrors(null)
    if (!file) {
      setError('Selecione um arquivo CSV ou XLSX')
      return
    }
    if (validation?.missingRequired?.length) {
      setError(`Colunas obrigatórias ausentes: ${validation.missingRequired.join(', ')}`)
      return
    }
    if (validation?.rowErrors?.length) {
      setError('Existem erros de validação na prévia. Corrija antes de importar.')
      return
    }
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('mode', mode)
      formData.append('file', file)
      await uploadMultipart('/admin/import', formData, { token })
      onDone()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setBackendErrors(extractBackendErrors(err.details))
      } else {
        setError('Erro ao importar')
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold">Importar CSV/XLSX</div>
      <div className="mt-1 text-xs text-white/60">Colunas: COD_SEGMENTO, SECAO, PRODUTO, QTD_IDEAL (ou QTD_30), QTD_7, QTD_15, QTD_60, QTD_90, UNIDADE, VALOR_MEDIO, OBS</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-white/60">Modo</div>
          <select
            className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={mode}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'UPSERT' || v === 'INSERT' || v === 'REPLACE') setMode(v)
            }}
          >
            <option value="UPSERT" className="bg-[#0B1020]">UPSERT</option>
            <option value="INSERT" className="bg-[#0B1020]">INSERT</option>
            <option value="REPLACE" className="bg-[#0B1020]">REPLACE</option>
          </select>
        </div>
        <div>
          <div className="mb-1 text-xs text-white/60">Arquivo</div>
          <input
            className="block h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="mt-4">
        {parsing ? (
          <div className="h-24 animate-pulse rounded-md border border-white/10 bg-white/5" />
        ) : !file ? null : !validation ? (
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">Prévia indisponível.</div>
        ) : (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Prévia e validação</div>
                <div className="mt-1 text-xs text-white/60">
                  Linhas detectadas: {validation.totalRows} · Colunas: {validation.columns.length}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {qtyMeta?.base && (
                  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                    Base: {qtyMeta.base}
                  </div>
                )}
                {qtyMeta?.extra.map((c) => (
                  <div key={c} className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {c}
                  </div>
                ))}
                {validation.missingRequired.length === 0 && validation.rowErrors.length === 0 ? (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">OK</div>
                ) : (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">Ajustes necessários</div>
                )}
              </div>
            </div>

            {validation.missingRequired.length > 0 && (
              <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
                Colunas obrigatórias ausentes: {validation.missingRequired.join(', ')}
              </div>
            )}

            {validation.rowErrors.length > 0 && (
              <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
                <div className="font-medium">Erros (amostra)</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                  {validation.rowErrors.map((e, idx) => (
                    <li key={idx}>
                      Linha {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-white/50">
                  <tr>
                    {[...REQUIRED_COLS, ...OPTIONAL_COLS]
                      .concat(QTY_COLS)
                      .filter((c, i, arr) => arr.indexOf(c) === i)
                      .filter((c) => validation.columns.includes(c))
                      .map((c) => (
                        <th key={c} className="py-2 pr-3">
                          {c}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {validation.previewRows.map((r, idx) => (
                    <tr key={idx} className="border-t border-white/10">
                      {[...REQUIRED_COLS, ...OPTIONAL_COLS]
                        .concat(QTY_COLS)
                        .filter((c, i, arr) => arr.indexOf(c) === i)
                        .filter((c) => validation.columns.includes(c))
                        .map((c) => (
                          <td key={c} className="py-2 pr-3 text-white/70">
                            {String(r[c] ?? '')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {error && <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">{error}</div>}
      {backendErrors && (
        <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
          <div className="font-medium">Detalhes do servidor</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
            {backendErrors.slice(0, 20).map((e, idx) => (
              <li key={idx}>
                Linha {e.row}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3">
        <Button onClick={runImport} disabled={importing || parsing}>
          {importing ? 'Importando…' : 'Aplicar importação'}
        </Button>
      </div>
    </Card>
  )
}
