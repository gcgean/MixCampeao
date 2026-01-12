import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { apiFetch, ApiError } from '@/utils/api'
import { formatBRL } from '@/utils/format'
import { useAuthStore } from '@/stores/authStore'
import * as XLSX from 'xlsx'

type Segment = {
  id: string
  code: string
  slug: string
  name: string
  price_pix: number
  teaser: string | null
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

type Report = {
  segment: { slug: string; name: string; price_pix: number }
  totals: {
    grand_total: number
    grand_total_7: number
    grand_total_15: number
    grand_total_30: number
    grand_total_60: number
    grand_total_90: number
  }
  sections: Array<{
    name: string
    total_7: number
    total_15: number
    total_30: number
    total_60: number
    total_90: number
    items: Array<{
      product: string
      unit: string | null
      qty_ideal_7: number
      qty_ideal_15: number
      qty_ideal_30: number
      qty_ideal_60: number
      qty_ideal_90: number
      avg_price: number
      line_total_7: number
      line_total_15: number
      line_total_30: number
      line_total_60: number
      line_total_90: number
      note: string | null
    }>
  }>
}

export default function SegmentPage() {
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

  const [report, setReport] = useState<Report | null>(null)
  const pollingRef = useRef<number | null>(null)

  const [days, setDays] = useState<7 | 15 | 30 | 60 | 90>(30)

  const grandTotal = useMemo(() => {
    if (!report) return 0
    switch (days) {
      case 7:
        return report.totals.grand_total_7
      case 15:
        return report.totals.grand_total_15
      case 30:
        return report.totals.grand_total_30
      case 60:
        return report.totals.grand_total_60
      case 90:
        return report.totals.grand_total_90
    }
  }, [days, report])

  function sectionTotal(sec: Report['sections'][number]) {
    switch (days) {
      case 7:
        return sec.total_7
      case 15:
        return sec.total_15
      case 30:
        return sec.total_30
      case 60:
        return sec.total_60
      case 90:
        return sec.total_90
    }
  }

  function lineTotal(it: Report['sections'][number]['items'][number]) {
    switch (days) {
      case 7:
        return it.line_total_7
      case 15:
        return it.line_total_15
      case 30:
        return it.line_total_30
      case 60:
        return it.line_total_60
      case 90:
        return it.line_total_90
    }
  }

  function exportExcel() {
    if (!segment || !report) return
    const aoa: Array<Array<string | number | null>> = []
    aoa.push(['Segmento', report.segment.name])
    aoa.push(['Período (dias)', days])
    aoa.push(['Exportado em', new Date().toLocaleString('pt-BR')])
    aoa.push([])

    aoa.push([
      'Seção',
      'Produto',
      'Un',
      'Qtd 7',
      'Qtd 15',
      'Qtd 30',
      'Qtd 60',
      'Qtd 90',
      'Preço médio',
      'Total 7',
      'Total 15',
      'Total 30',
      'Total 60',
      'Total 90',
      'Obs',
    ])

    for (const sec of report.sections) {
      for (const it of sec.items) {
        aoa.push([
          sec.name,
          it.product,
          it.unit ?? '',
          it.qty_ideal_7,
          it.qty_ideal_15,
          it.qty_ideal_30,
          it.qty_ideal_60,
          it.qty_ideal_90,
          it.avg_price,
          it.line_total_7,
          it.line_total_15,
          it.line_total_30,
          it.line_total_60,
          it.line_total_90,
          it.note ?? '',
        ])
      }

      aoa.push([
        sec.name,
        'Subtotal',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        sec.total_7,
        sec.total_15,
        sec.total_30,
        sec.total_60,
        sec.total_90,
        '',
      ])
    }

    aoa.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      report.totals.grand_total_7,
      report.totals.grand_total_15,
      report.totals.grand_total_30,
      report.totals.grand_total_60,
      report.totals.grand_total_90,
      '',
    ])

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    const safeSlug = slug.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
    const filename = `relatorio-${safeSlug}-${days}d.xlsx`
    XLSX.writeFile(wb, filename)
  }

  function exportPdf() {
    if (!segment || !report) return
    const css = `
      @page { size: A4 landscape; margin: 12mm; }
      html, body { font-family: Arial, Helvetica, sans-serif; color: #111; }
      h1 { font-size: 18px; margin: 0 0 6px 0; }
      .meta { font-size: 12px; color: #333; margin-bottom: 12px; }
      .totals { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 10px 0 14px 0; }
      .pill { border: 1px solid #ddd; border-radius: 8px; padding: 8px; font-size: 12px; }
      .pill strong { display: block; font-size: 13px; }
      h2 { font-size: 14px; margin: 14px 0 6px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
      th { background: #f5f5f5; text-align: left; }
      .right { text-align: right; }
      .muted { color: #666; font-size: 10px; }
    `.trim()

    function n(v: number) {
      return String(v)
    }

    function money(v: number) {
      return formatBRL(v)
    }

    const totalsHtml = `
      <div class="totals">
        <div class="pill"><div class="muted">Total 7 dias</div><strong>${money(report.totals.grand_total_7)}</strong></div>
        <div class="pill"><div class="muted">Total 15 dias</div><strong>${money(report.totals.grand_total_15)}</strong></div>
        <div class="pill"><div class="muted">Total 30 dias</div><strong>${money(report.totals.grand_total_30)}</strong></div>
        <div class="pill"><div class="muted">Total 60 dias</div><strong>${money(report.totals.grand_total_60)}</strong></div>
        <div class="pill"><div class="muted">Total 90 dias</div><strong>${money(report.totals.grand_total_90)}</strong></div>
      </div>
    `.trim()

    const sectionTables = report.sections
      .map((sec) => {
        const rows = sec.items
          .map((it) => {
            const note = it.note ? `<div class="muted">${String(it.note)}</div>` : ''
            return `
              <tr>
                <td>${String(it.product)}${note}</td>
                <td>${String(it.unit ?? '')}</td>
                <td class="right">${n(it.qty_ideal_7)}</td>
                <td class="right">${n(it.qty_ideal_15)}</td>
                <td class="right">${n(it.qty_ideal_30)}</td>
                <td class="right">${n(it.qty_ideal_60)}</td>
                <td class="right">${n(it.qty_ideal_90)}</td>
                <td class="right">${money(it.avg_price)}</td>
                <td class="right">${money(it.line_total_7)}</td>
                <td class="right">${money(it.line_total_15)}</td>
                <td class="right">${money(it.line_total_30)}</td>
                <td class="right">${money(it.line_total_60)}</td>
                <td class="right">${money(it.line_total_90)}</td>
              </tr>
            `.trim()
          })
          .join('')

        const subtotal = `
          <tr>
            <td colspan="8"><strong>Subtotal</strong></td>
            <td class="right"><strong>${money(sec.total_7)}</strong></td>
            <td class="right"><strong>${money(sec.total_15)}</strong></td>
            <td class="right"><strong>${money(sec.total_30)}</strong></td>
            <td class="right"><strong>${money(sec.total_60)}</strong></td>
            <td class="right"><strong>${money(sec.total_90)}</strong></td>
          </tr>
        `.trim()

        return `
          <h2>${String(sec.name)}</h2>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Un</th>
                <th class="right">7d</th>
                <th class="right">15d</th>
                <th class="right">30d</th>
                <th class="right">60d</th>
                <th class="right">90d</th>
                <th class="right">Médio</th>
                <th class="right">Total 7</th>
                <th class="right">Total 15</th>
                <th class="right">Total 30</th>
                <th class="right">Total 60</th>
                <th class="right">Total 90</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              ${subtotal}
            </tbody>
          </table>
        `.trim()
      })
      .join('')

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório — ${String(report.segment.name)}</title>
          <style>${css}</style>
        </head>
        <body>
          <h1>Relatório — ${String(report.segment.name)}</h1>
          <div class="meta">Período selecionado: ${days} dias · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
          ${totalsHtml}
          ${sectionTables}
          <script>window.onload = () => { window.focus(); window.print(); };</script>
        </body>
      </html>
    `.trim()

    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

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
    if (!token || !purchased) {
      setReport(null)
      return
    }
    let alive = true
    async function loadReport() {
      try {
        const data = await apiFetch<Report>(`/segments/${slug}/report`, { token })
        if (!alive) return
        setReport(data)
      } catch {
        if (!alive) return
        setReport(null)
      }
    }
    loadReport()
    return () => {
      alive = false
    }
  }, [slug, token, purchased])

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  async function startPayment() {
    if (!user || !token) {
      navigate('/entrar', { state: { from: `/segmentos/${slug}` } })
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
    <div className="space-y-4">
      {loading ? (
        <Card className="h-28 animate-pulse" />
      ) : error || !segment ? (
        <Card className="border-rose-500/30 bg-rose-500/10 p-4 text-sm">{error || 'Segmento não encontrado'}</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-xs text-white/60">Segmento</div>
              <div className="mt-1 text-lg font-semibold">{segment.name}</div>
              <div className="mt-1 text-sm text-white/70">{segment.teaser || 'Relatório completo por seção.'}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-white/60">Compra única</div>
                <div className="text-base font-semibold">{formatBRL(segment.price_pix)}</div>
              </div>
              <div className="mt-3">
                {purchased ? (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                    Acesso liberado.
                  </div>
                ) : !user ? (
                  <Link to="/entrar" state={{ from: `/segmentos/${slug}` }}>
                    <Button className="w-full">Entrar para comprar</Button>
                  </Link>
                ) : (
                  <Button className="w-full" onClick={startPayment}>
                    Desbloquear por Pix
                  </Button>
                )}
              </div>
              {payError && <div className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">{payError}</div>}
            </Card>

            {!purchased && purchaseId && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Checkout Pix</div>
                  <div className="text-xs text-white/60">Status: {payStatus || '—'}</div>
                </div>
                <div className="mt-3 grid gap-3">
                  {qrCodeDataUrl && (
                    <div className="rounded-lg bg-white p-3">
                      <img src={qrCodeDataUrl} alt="QR Code Pix" className="mx-auto h-52 w-52" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-white/60">Pix copia e cola</div>
                    <div className="mt-1 rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white/80 break-all">
                      {copyPaste}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={copyPix}>
                        Copiar
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" onClick={startPayment}>
                        Regerar
                      </Button>
                    </div>
                    {expiresInText && <div className="mt-2 text-xs text-white/60">Expira em: {expiresInText}</div>}
                    <div className="mt-2 text-xs text-white/50">
                      A liberação acontece automaticamente após confirmação do provedor Pix.
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Relatório por seções</div>
                <div className="text-xs text-white/60">{purchased ? 'Completo' : 'Prévia Top 3'}</div>
              </div>
              {!purchased ? (
                preview.length === 0 ? (
                  <div className="mt-3 text-sm text-white/60">Sem dados disponíveis.</div>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                )
              ) : !report ? (
                <div className="mt-3 text-sm text-white/60">Carregando relatório…</div>
              ) : (
                <div className="mt-3 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs text-white/60">Período:</div>
                    {[7, 15, 30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d as 7 | 15 | 30 | 60 | 90)}
                        className={
                          d === days
                            ? 'h-8 rounded-md bg-violet-500 px-3 text-xs font-semibold text-white'
                            : 'h-8 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10'
                        }
                      >
                        {d} dias
                      </button>
                    ))}
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="secondary" onClick={exportExcel}>
                        Exportar Excel
                      </Button>
                      <Button size="sm" variant="secondary" onClick={exportPdf}>
                        Exportar PDF
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/60">Total estimado</div>
                    <div className="mt-1 text-lg font-semibold">{formatBRL(grandTotal)}</div>
                  </div>
                  <div className="space-y-3">
                    {report.sections.map((sec) => (
                      <div key={sec.name} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{sec.name}</div>
                          <div className="text-xs font-semibold text-white/80">{formatBRL(sectionTotal(sec))}</div>
                        </div>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-white/50">
                              <tr>
                                <th className="py-2">Produto</th>
                                <th className="py-2">7d</th>
                                <th className="py-2">15d</th>
                                <th className="py-2">30d</th>
                                <th className="py-2">60d</th>
                                <th className="py-2">90d</th>
                                <th className="py-2">Médio</th>
                                <th className="py-2">Total ({days}d)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sec.items.map((it, idx) => (
                                <tr key={`${it.product}-${idx}`} className="border-t border-white/10">
                                  <td className="py-2 pr-2">
                                    <div className="font-medium">{it.product}</div>
                                    {it.note && <div className="text-xs text-white/50">{it.note}</div>}
                                  </td>
                                  <td className="py-2 text-white/70">{it.qty_ideal_7} {it.unit || ''}</td>
                                  <td className="py-2 text-white/70">{it.qty_ideal_15} {it.unit || ''}</td>
                                  <td className="py-2 text-white/70">{it.qty_ideal_30} {it.unit || ''}</td>
                                  <td className="py-2 text-white/70">{it.qty_ideal_60} {it.unit || ''}</td>
                                  <td className="py-2 text-white/70">{it.qty_ideal_90} {it.unit || ''}</td>
                                  <td className="py-2 text-white/70">{formatBRL(it.avg_price)}</td>
                                  <td className="py-2 font-semibold">{formatBRL(lineTotal(it))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
