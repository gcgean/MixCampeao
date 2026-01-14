import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { parsePtNumber } from '../utils/parseNumber.js'
import { slugify } from '../utils/slugify.js'
import { sendError, sendOk } from '../utils/responses.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function pgErrorCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null
  const code = (err as { code?: unknown }).code
  if (code === undefined || code === null) return null
  return String(code)
}

function toRowObjects(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  const out: Record<string, unknown>[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    out.push(item as Record<string, unknown>)
  }
  return out
}

router.use(requireAuth)
router.use(requireRole('admin'))

router.get('/segments', async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT id, code, slug, name, price_pix, teaser, active, created_at, updated_at
     FROM segments
     ORDER BY created_at DESC`,
  )
  sendOk(res, 200, { segments: result.rows })
})

router.post('/segments', async (req: Request, res: Response) => {
  const schema = z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
    price_pix: z.number().nonnegative(),
    teaser: z.string().optional().nullable(),
    active: z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }
  const { id, code, slug, name, price_pix, teaser, active } = parsed.data
  const finalActive = active ?? true

  try {
    const result = await pool.query(
      `INSERT INTO segments (id, code, slug, name, price_pix, teaser, active)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         slug = EXCLUDED.slug,
         name = EXCLUDED.name,
         price_pix = EXCLUDED.price_pix,
         teaser = EXCLUDED.teaser,
         active = EXCLUDED.active
       RETURNING id`,
      [id ?? null, code, slug, name, price_pix, teaser ?? null, finalActive],
    )
    sendOk(res, 200, { id: result.rows[0]?.id })
  } catch (err: unknown) {
    if (pgErrorCode(err) === '23505') {
      sendError(res, 409, 'CONFLICT', 'Código/slug já existe')
      return
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao salvar segmento')
  }
})

router.delete('/segments/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const purchases = await pool.query<{ c: string }>(
    `SELECT count(*)::text as c FROM purchases WHERE segment_id = $1`,
    [id],
  )
  const count = Number(purchases.rows[0]?.c ?? '0')
  if (count > 0) {
    await pool.query('UPDATE segments SET active = false WHERE id = $1', [id])
    sendOk(res, 200, { ok: true, softDeleted: true })
    return
  }
  await pool.query('DELETE FROM segment_products WHERE segment_id = $1', [id])
  await pool.query('DELETE FROM sections WHERE segment_id = $1', [id])
  await pool.query('DELETE FROM segments WHERE id = $1', [id])
  sendOk(res, 200, { ok: true })
})

router.get('/segments/:segmentId/sections', async (req: Request, res: Response) => {
  const segmentId = req.params.segmentId
  const result = await pool.query(
    `SELECT id, segment_id, name, sort_order
     FROM sections
     WHERE segment_id = $1
     ORDER BY sort_order ASC, name ASC`,
    [segmentId],
  )
  sendOk(res, 200, { sections: result.rows })
})

router.post('/sections', async (req: Request, res: Response) => {
  const schema = z.object({
    id: z.string().uuid().optional(),
    segment_id: z.string().uuid(),
    name: z.string().min(1),
    sort_order: z.number().int().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }
  const { id, segment_id, name, sort_order } = parsed.data
  try {
    const result = await pool.query(
      `INSERT INTO sections (id, segment_id, name, sort_order)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         segment_id = EXCLUDED.segment_id,
         name = EXCLUDED.name,
         sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [id ?? null, segment_id, name, sort_order ?? 0],
    )
    sendOk(res, 200, { id: result.rows[0]?.id })
  } catch (err: unknown) {
    if (pgErrorCode(err) === '23505') {
      sendError(res, 409, 'CONFLICT', 'Seção já existe neste segmento')
      return
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao salvar seção')
  }
})

router.get('/products', async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT id, name::text as name, unit
     FROM products
     ORDER BY name ASC`,
  )
  sendOk(res, 200, { products: result.rows })
})

router.post('/products', async (req: Request, res: Response) => {
  const schema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    unit: z.string().optional().nullable(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }
  const { id, name, unit } = parsed.data
  try {
    const result = await pool.query(
      `INSERT INTO products (id, name, unit)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         unit = EXCLUDED.unit
       RETURNING id`,
      [id ?? null, name, unit ?? null],
    )
    sendOk(res, 200, { id: result.rows[0]?.id })
  } catch (err: unknown) {
    if (pgErrorCode(err) === '23505') {
      sendError(res, 409, 'CONFLICT', 'Produto já existe')
      return
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao salvar produto')
  }
})

router.get('/segment-products', async (req: Request, res: Response) => {
  const segmentId = String(req.query.segmentId || '')
  if (!segmentId) {
    sendError(res, 400, 'VALIDATION_ERROR', 'segmentId é obrigatório')
    return
  }
  const result = await pool.query(
    `SELECT sp.id, sp.segment_id, sp.section_id, sp.product_id,
            sp.qty_ideal_7, sp.qty_ideal_15, sp.qty_ideal_30, sp.qty_ideal_60, sp.qty_ideal_90,
            sp.avg_price, sp.note,
            p.name::text as product_name, p.unit,
            s.name as section_name
     FROM segment_products sp
     JOIN products p ON p.id = sp.product_id
     LEFT JOIN sections s ON s.id = sp.section_id
     WHERE sp.segment_id = $1
     ORDER BY s.sort_order NULLS FIRST, s.name NULLS FIRST, p.name`,
    [segmentId],
  )
  sendOk(res, 200, { items: result.rows })
})

router.post('/segment-products', async (req: Request, res: Response) => {
  function round3(n: number): number {
    return Math.round(n * 1000) / 1000
  }

  function deriveQty(base30: number, days: number): number {
    return round3((base30 * days) / 30)
  }

  const schema = z.object({
    id: z.string().uuid().optional(),
    segment_id: z.string().uuid(),
    section_id: z.string().uuid().optional().nullable(),
    product_id: z.string().uuid(),
    qty_ideal_30: z.number().nonnegative(),
    qty_ideal_7: z.number().nonnegative().optional(),
    qty_ideal_15: z.number().nonnegative().optional(),
    qty_ideal_60: z.number().nonnegative().optional(),
    qty_ideal_90: z.number().nonnegative().optional(),
    avg_price: z.number().nonnegative(),
    note: z.string().optional().nullable(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }
  const { id, segment_id, section_id, product_id, qty_ideal_30, avg_price, note } = parsed.data
  const qty7 = parsed.data.qty_ideal_7 ?? deriveQty(qty_ideal_30, 7)
  const qty15 = parsed.data.qty_ideal_15 ?? deriveQty(qty_ideal_30, 15)
  const qty60 = parsed.data.qty_ideal_60 ?? deriveQty(qty_ideal_30, 60)
  const qty90 = parsed.data.qty_ideal_90 ?? deriveQty(qty_ideal_30, 90)
  try {
    const result = await pool.query(
      `INSERT INTO segment_products (
         id,
         segment_id,
         section_id,
         product_id,
         qty_ideal_7,
         qty_ideal_15,
         qty_ideal_30,
         qty_ideal_60,
         qty_ideal_90,
         avg_price,
         note
       )
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (segment_id, product_id) DO UPDATE SET
         section_id = EXCLUDED.section_id,
         qty_ideal_7 = EXCLUDED.qty_ideal_7,
         qty_ideal_15 = EXCLUDED.qty_ideal_15,
         qty_ideal_30 = EXCLUDED.qty_ideal_30,
         qty_ideal_60 = EXCLUDED.qty_ideal_60,
         qty_ideal_90 = EXCLUDED.qty_ideal_90,
         avg_price = EXCLUDED.avg_price,
         note = EXCLUDED.note
       RETURNING id`,
      [
        id ?? null,
        segment_id,
        section_id ?? null,
        product_id,
        qty7,
        qty15,
        qty_ideal_30,
        qty60,
        qty90,
        avg_price,
        note ?? null,
      ],
    )
    sendOk(res, 200, { id: result.rows[0]?.id })
  } catch (err: unknown) {
    if (pgErrorCode(err) === '23505') {
      sendError(res, 409, 'CONFLICT', 'Vínculo já existe no segmento')
      return
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao salvar vínculo')
  }
})

router.delete('/segment-products/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const result = await pool.query('DELETE FROM segment_products WHERE id = $1', [id])
  if (result.rowCount === 0) {
    sendError(res, 404, 'NOT_FOUND', 'Vínculo não encontrado')
    return
  }
  sendOk(res, 200, { ok: true })
})

router.get('/import', async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT id, file_name, mode, status, total_rows, inserted, updated, skipped, created_at
     FROM import_jobs
     ORDER BY created_at DESC
     LIMIT 50`,
  )
  sendOk(res, 200, { jobs: result.rows })
})

router.get('/import/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const result = await pool.query(
    `SELECT * FROM import_jobs WHERE id = $1`,
    [id],
  )
  const job = result.rows[0]
  if (!job) {
    sendError(res, 404, 'NOT_FOUND', 'Importação não encontrada')
    return
  }
  sendOk(res, 200, { job })
})

router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  const schema = z.object({
    mode: z.enum(['UPSERT', 'INSERT', 'REPLACE']),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Modo inválido')
    return
  }
  const mode = parsed.data.mode
  const file = req.file
  if (!file) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Arquivo é obrigatório')
    return
  }

  const jobRes = await pool.query<{ id: string }>(
    `INSERT INTO import_jobs (user_id, file_name, mode, status)
     VALUES ($1, $2, $3, 'PROCESSING')
     RETURNING id`,
    [req.user?.id, file.originalname, mode],
  )
  const jobId = jobRes.rows[0]?.id

  const errors: Array<{ row: number; message: string }> = []
  let rows: Record<string, unknown>[] = []

  try {
    const ext = file.originalname.toLowerCase()
    if (ext.endsWith('.csv')) {
      const records = parse(file.buffer.toString('utf8'), {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      })
      rows = toRowObjects(records)
    } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      rows = toRowObjects(json)
    } else {
      throw new Error('Formato não suportado (use CSV ou XLSX)')
    }
  } catch (err: unknown) {
    await pool.query(
      `UPDATE import_jobs SET status = 'FAILED', errors_json = $2 WHERE id = $1`,
      [jobId, JSON.stringify([{ row: 0, message: String((err as { message?: unknown })?.message ?? err) }])],
    )
    sendError(res, 400, 'VALIDATION_ERROR', 'Erro ao ler arquivo', String((err as { message?: unknown })?.message ?? err))
    return
  }

  if (rows.length === 0) {
    await pool.query(
      `UPDATE import_jobs SET status = 'FAILED', total_rows = 0, errors_json = $2 WHERE id = $1`,
      [jobId, JSON.stringify([{ row: 0, message: 'Arquivo vazio' }])],
    )
    sendError(res, 400, 'VALIDATION_ERROR', 'Arquivo vazio')
    return
  }

  const normalized = rows.map((r) => {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) {
      obj[String(k).trim().toUpperCase()] = v
    }
    return obj
  })

  const requiredCols = ['COD_SEGMENTO', 'PRODUTO', 'VALOR_MEDIO']
  const cols = Object.keys(normalized[0] || {})
  for (const col of requiredCols) {
    if (!cols.includes(col)) {
      errors.push({ row: 0, message: `Coluna obrigatória ausente: ${col}` })
    }
  }

  const hasQtyBase = cols.includes('QTD_30') || cols.includes('QTD_IDEAL')
  if (!hasQtyBase) {
    errors.push({ row: 0, message: 'Coluna obrigatória ausente: QTD_IDEAL ou QTD_30' })
  }

  const prepared: Array<{
    codSegmento: string
    secao: string | null
    produto: string
    qtd7: number
    qtd15: number
    qtd30: number
    qtd60: number
    qtd90: number
    unidade: string | null
    valorMedio: number
    obs: string | null
  }> = []

  for (let i = 0; i < normalized.length; i++) {
    const row = normalized[i]
    const rowNumber = i + 2
    const cod = String(row.COD_SEGMENTO || '').trim()
    const produto = String(row.PRODUTO || '').trim()
    const secao = String(row.SECAO || '').trim()
    const unidade = String(row.UNIDADE || '').trim()
    const qtdBase30 = parsePtNumber(row.QTD_30 ?? row.QTD_IDEAL)
    const qtd7 = parsePtNumber(row.QTD_7)
    const qtd15 = parsePtNumber(row.QTD_15)
    const qtd60 = parsePtNumber(row.QTD_60)
    const qtd90 = parsePtNumber(row.QTD_90)
    const valor = parsePtNumber(row.VALOR_MEDIO)
    const obs = String(row.OBS || '').trim()

    if (!cod) errors.push({ row: rowNumber, message: 'COD_SEGMENTO vazio' })
    if (!produto) errors.push({ row: rowNumber, message: 'PRODUTO vazio' })
    if (qtdBase30 === null || qtdBase30 < 0) errors.push({ row: rowNumber, message: 'QTD_IDEAL ou QTD_30 inválido' })
    if (qtd7 !== null && qtd7 < 0) errors.push({ row: rowNumber, message: 'QTD_7 inválido' })
    if (qtd15 !== null && qtd15 < 0) errors.push({ row: rowNumber, message: 'QTD_15 inválido' })
    if (qtd60 !== null && qtd60 < 0) errors.push({ row: rowNumber, message: 'QTD_60 inválido' })
    if (qtd90 !== null && qtd90 < 0) errors.push({ row: rowNumber, message: 'QTD_90 inválido' })
    if (valor === null || valor < 0) errors.push({ row: rowNumber, message: 'VALOR_MEDIO inválido' })

    if (cod && produto && qtdBase30 !== null && qtdBase30 >= 0 && valor !== null && valor >= 0) {
      const q7 = qtd7 ?? (Math.round(((qtdBase30 * 7) / 30) * 1000) / 1000)
      const q15 = qtd15 ?? (Math.round(((qtdBase30 * 15) / 30) * 1000) / 1000)
      const q60 = qtd60 ?? (Math.round(((qtdBase30 * 60) / 30) * 1000) / 1000)
      const q90 = qtd90 ?? (Math.round(((qtdBase30 * 90) / 30) * 1000) / 1000)
      prepared.push({
        codSegmento: cod,
        secao: secao ? secao : null,
        produto,
        qtd7: q7,
        qtd15: q15,
        qtd30: qtdBase30,
        qtd60: q60,
        qtd90: q90,
        unidade: unidade ? unidade : null,
        valorMedio: valor,
        obs: obs ? obs : null,
      })
    }
  }

  if (errors.length > 0) {
    await pool.query(
      `UPDATE import_jobs
       SET status = 'FAILED', total_rows = $2, errors_json = $3
       WHERE id = $1`,
      [jobId, normalized.length, JSON.stringify(errors)],
    )
    sendError(res, 400, 'VALIDATION_ERROR', 'Erros de validação', { jobId, errors })
    return
  }

  const segmentCodes = Array.from(new Set(prepared.map((p) => p.codSegmento)))
  const segmentIdsByCode = new Map<string, string>()

  await pool.query('BEGIN')
  let inserted = 0
  let updated = 0
  let skipped = 0
  try {
    for (const code of segmentCodes) {
      const segRes = await pool.query<{ id: string; code: string }>(
        `SELECT id, code FROM segments WHERE code = $1`,
        [code],
      )
      if (segRes.rowCount > 0) {
        segmentIdsByCode.set(code, segRes.rows[0].id)
        continue
      }
      const slug = slugify(code)
      const created = await pool.query<{ id: string }>(
        `INSERT INTO segments (code, slug, name, price_pix, teaser, active)
         VALUES ($1, $2, $3, 0, NULL, true)
         RETURNING id`,
        [code, slug || code.toLowerCase(), code],
      )
      segmentIdsByCode.set(code, created.rows[0].id)
    }

    if (mode === 'REPLACE') {
      const ids = segmentCodes.map((c) => segmentIdsByCode.get(c)).filter(Boolean)
      if (ids.length > 0) {
        await pool.query('DELETE FROM segment_products WHERE segment_id = ANY($1::uuid[])', [ids])
      }
    }

    for (const p of prepared) {
      const segmentId = segmentIdsByCode.get(p.codSegmento)
      if (!segmentId) continue

      let sectionId: string | null = null
      if (p.secao) {
        const secRes = await pool.query<{ id: string }>(
          `INSERT INTO sections (segment_id, name, sort_order)
           VALUES ($1, $2, 0)
           ON CONFLICT (segment_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [segmentId, p.secao],
        )
        sectionId = secRes.rows[0]?.id ?? null
      }

      const prodRes = await pool.query<{ id: string; unit: string | null }>(
        `INSERT INTO products (name, unit)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET
           unit = COALESCE(products.unit, EXCLUDED.unit)
         RETURNING id, unit`,
        [p.produto, p.unidade],
      )
      const productId = prodRes.rows[0]?.id
      if (!productId) continue

      const qty7 = p.qtd7
      const qty15 = p.qtd15
      const qty60 = p.qtd60
      const qty90 = p.qtd90

      if (mode === 'INSERT') {
        const ins = await pool.query(
          `INSERT INTO segment_products (
             segment_id,
             section_id,
             product_id,
             qty_ideal_7,
             qty_ideal_15,
             qty_ideal_30,
             qty_ideal_60,
             qty_ideal_90,
             avg_price,
             note
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (segment_id, product_id) DO NOTHING`,
          [segmentId, sectionId, productId, qty7, qty15, p.qtd30, qty60, qty90, p.valorMedio, p.obs],
        )
        if (ins.rowCount === 0) skipped++
        else inserted++
        continue
      }

      const up = await pool.query<{ inserted: boolean }>(
        `INSERT INTO segment_products (
           segment_id,
           section_id,
           product_id,
           qty_ideal_7,
           qty_ideal_15,
           qty_ideal_30,
           qty_ideal_60,
           qty_ideal_90,
           avg_price,
           note
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (segment_id, product_id) DO UPDATE SET
           section_id = EXCLUDED.section_id,
           qty_ideal_7 = EXCLUDED.qty_ideal_7,
           qty_ideal_15 = EXCLUDED.qty_ideal_15,
           qty_ideal_30 = EXCLUDED.qty_ideal_30,
           qty_ideal_60 = EXCLUDED.qty_ideal_60,
           qty_ideal_90 = EXCLUDED.qty_ideal_90,
           avg_price = EXCLUDED.avg_price,
           note = EXCLUDED.note
         RETURNING (xmax = 0) AS inserted`,
        [segmentId, sectionId, productId, qty7, qty15, p.qtd30, qty60, qty90, p.valorMedio, p.obs],
      )
      if (up.rows[0]?.inserted) inserted++
      else updated++
    }

    await pool.query(
      `UPDATE import_jobs
       SET status = 'DONE', total_rows = $2, inserted = $3, updated = $4, skipped = $5
       WHERE id = $1`,
      [jobId, prepared.length, inserted, updated, skipped],
    )
    await pool.query('COMMIT')
  } catch (err: unknown) {
    await pool.query('ROLLBACK')
    await pool.query(
      `UPDATE import_jobs
       SET status = 'FAILED', total_rows = $2, errors_json = $3
       WHERE id = $1`,
      [jobId, prepared.length, JSON.stringify([{ row: 0, message: String((err as { message?: unknown })?.message ?? err) }])],
    )
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao aplicar importação')
    return
  }

  sendOk(res, 200, { jobId, mode, totalRows: prepared.length, inserted, updated, skipped })
})

export default router

