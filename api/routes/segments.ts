import { Router, type Request, type Response } from 'express'
import { pool } from '../db/pool.js'
import { optionalAuth } from '../middleware/optionalAuth.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { sendError, sendOk } from '../utils/responses.js'

const router = Router()

type PreviewItem = {
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
}

type PreviewSectionOut = {
  name: string
  items: PreviewItem[]
}

type ReportItem = {
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
}

type ReportSectionOut = {
  name: string
  total_7: number
  total_15: number
  total_30: number
  total_60: number
  total_90: number
  items: ReportItem[]
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const segmentsRes = await pool.query<{
    id: string
    code: string
    slug: string
    name: string
    price_pix: string
    teaser: string | null
    active: boolean
  }>(
    `SELECT id, code, slug, name, price_pix, teaser, active
     FROM segments
     WHERE active = true
     ORDER BY name`,
  )

  const segments = segmentsRes.rows.map((s) => ({
    ...s,
    price_pix: Number(s.price_pix),
  }))

  if (!req.user) {
    sendOk(res, 200, { segments })
    return
  }

  const paidRes = await pool.query<{ segment_id: string }>(
    `SELECT segment_id
     FROM purchases
     WHERE user_id = $1 AND status = 'PAID'`,
    [req.user.id],
  )
  const paid = new Set(paidRes.rows.map((r) => r.segment_id))

  sendOk(res, 200, {
    segments: segments.map((s) => ({ ...s, purchased: paid.has(s.id) })),
  })
})

router.get('/:slug', optionalAuth, async (req: Request, res: Response) => {
  const slug = req.params.slug
  const segmentRes = await pool.query<{
    id: string
    code: string
    slug: string
    name: string
    price_pix: string
    teaser: string | null
    active: boolean
  }>(
    `SELECT id, code, slug, name, price_pix, teaser, active
     FROM segments
     WHERE slug = $1`,
    [slug],
  )

  const segment = segmentRes.rows[0]
  if (!segment || !segment.active) {
    sendError(res, 404, 'NOT_FOUND', 'Segmento não encontrado')
    return
  }

  const previewRes = await pool.query<{
    section_id: string | null
    section_name: string | null
    product: string
    unit: string | null
    qty_ideal_7: string
    qty_ideal_15: string
    qty_ideal_30: string
    qty_ideal_60: string
    qty_ideal_90: string
    avg_price: string
    note: string | null
    line_total: string
    rn: number
  }>(
    `WITH items AS (
      SELECT
        sp.section_id,
        s.name AS section_name,
        p.name::text AS product,
        p.unit,
        sp.qty_ideal_7,
        sp.qty_ideal_15,
        sp.qty_ideal_30,
        sp.qty_ideal_60,
        sp.qty_ideal_90,
        sp.avg_price,
        sp.note,
        (sp.qty_ideal_30 * sp.avg_price) AS line_total,
        row_number() OVER (PARTITION BY sp.section_id ORDER BY (sp.qty_ideal_30 * sp.avg_price) DESC) AS rn
      FROM segment_products sp
      LEFT JOIN sections s ON s.id = sp.section_id
      JOIN products p ON p.id = sp.product_id
      WHERE sp.segment_id = $1
    )
    SELECT * FROM items WHERE rn <= 3
    ORDER BY section_name NULLS FIRST, rn ASC`,
    [segment.id],
  )

  const sectionsMap = new Map<string, PreviewSectionOut>()
  for (const row of previewRes.rows) {
    const key = row.section_id ?? 'no-section'
    const name = row.section_name ?? 'Sem seção'
    if (!sectionsMap.has(key)) sectionsMap.set(key, { name, items: [] })
    sectionsMap.get(key)!.items.push({
      product: row.product,
      unit: row.unit,
      qty_ideal_7: Number(row.qty_ideal_7),
      qty_ideal_15: Number(row.qty_ideal_15),
      qty_ideal_30: Number(row.qty_ideal_30),
      qty_ideal_60: Number(row.qty_ideal_60),
      qty_ideal_90: Number(row.qty_ideal_90),
      avg_price: Number(row.avg_price),
      line_total: Number(row.line_total),
      note: row.note,
    })
  }

  let purchased = false
  if (req.user) {
    const paidRes = await pool.query<{ ok: boolean }>(
      `SELECT true as ok
       FROM purchases
       WHERE user_id = $1 AND segment_id = $2 AND status = 'PAID'
       LIMIT 1`,
      [req.user.id, segment.id],
    )
    purchased = paidRes.rowCount > 0
  }

  sendOk(res, 200, {
    segment: { ...segment, price_pix: Number(segment.price_pix) },
    preview: Array.from(sectionsMap.values()),
    purchased,
  })
})

router.get('/:slug/report', requireAuth, async (req: Request, res: Response) => {
  const slug = req.params.slug
  const segmentRes = await pool.query<{
    id: string
    slug: string
    name: string
    price_pix: string
  }>(
    `SELECT id, slug, name, price_pix
     FROM segments
     WHERE slug = $1 AND active = true`,
    [slug],
  )
  const segment = segmentRes.rows[0]
  if (!segment) {
    sendError(res, 404, 'NOT_FOUND', 'Segmento não encontrado')
    return
  }

  const purchaseRes = await pool.query<{ ok: boolean }>(
    `SELECT true as ok
     FROM purchases
     WHERE user_id = $1 AND segment_id = $2 AND status = 'PAID'
     LIMIT 1`,
    [req.user?.id, segment.id],
  )
  if (purchaseRes.rowCount === 0) {
    sendError(res, 403, 'FORBIDDEN', 'Acesso não liberado para este segmento')
    return
  }

  const itemsRes = await pool.query<{
    section_id: string | null
    section_name: string | null
    product: string
    unit: string | null
    qty_ideal_7: string
    qty_ideal_15: string
    qty_ideal_30: string
    qty_ideal_60: string
    qty_ideal_90: string
    avg_price: string
    note: string | null
    line_total_7: string
    line_total_15: string
    line_total_30: string
    line_total_60: string
    line_total_90: string
  }>(
    `SELECT
      sp.section_id,
      s.name AS section_name,
      p.name::text AS product,
      p.unit,
      sp.qty_ideal_7,
      sp.qty_ideal_15,
      sp.qty_ideal_30,
      sp.qty_ideal_60,
      sp.qty_ideal_90,
      sp.avg_price,
      sp.note,
      (sp.qty_ideal_7 * sp.avg_price) AS line_total_7,
      (sp.qty_ideal_15 * sp.avg_price) AS line_total_15,
      (sp.qty_ideal_30 * sp.avg_price) AS line_total_30,
      (sp.qty_ideal_60 * sp.avg_price) AS line_total_60,
      (sp.qty_ideal_90 * sp.avg_price) AS line_total_90
    FROM segment_products sp
    LEFT JOIN sections s ON s.id = sp.section_id
    JOIN products p ON p.id = sp.product_id
    WHERE sp.segment_id = $1
    ORDER BY s.sort_order NULLS FIRST, s.name NULLS FIRST, p.name`,
    [segment.id],
  )

  const sections = new Map<string, ReportSectionOut>()
  let grand7 = 0
  let grand15 = 0
  let grand30 = 0
  let grand60 = 0
  let grand90 = 0
  for (const row of itemsRes.rows) {
    const key = row.section_id ?? 'no-section'
    const name = row.section_name ?? 'Sem seção'
    if (!sections.has(key)) {
      sections.set(key, {
        name,
        total_7: 0,
        total_15: 0,
        total_30: 0,
        total_60: 0,
        total_90: 0,
        items: [],
      })
    }
    const line7 = Number(row.line_total_7)
    const line15 = Number(row.line_total_15)
    const line30 = Number(row.line_total_30)
    const line60 = Number(row.line_total_60)
    const line90 = Number(row.line_total_90)
    sections.get(key)!.items.push({
      product: row.product,
      unit: row.unit,
      qty_ideal_7: Number(row.qty_ideal_7),
      qty_ideal_15: Number(row.qty_ideal_15),
      qty_ideal_30: Number(row.qty_ideal_30),
      qty_ideal_60: Number(row.qty_ideal_60),
      qty_ideal_90: Number(row.qty_ideal_90),
      avg_price: Number(row.avg_price),
      line_total_7: line7,
      line_total_15: line15,
      line_total_30: line30,
      line_total_60: line60,
      line_total_90: line90,
      note: row.note,
    })

    const sec = sections.get(key)!
    sec.total_7 += line7
    sec.total_15 += line15
    sec.total_30 += line30
    sec.total_60 += line60
    sec.total_90 += line90

    grand7 += line7
    grand15 += line15
    grand30 += line30
    grand60 += line60
    grand90 += line90
  }

  sendOk(res, 200, {
    segment: { slug: segment.slug, name: segment.name, price_pix: Number(segment.price_pix) },
    totals: {
      grand_total: grand30,
      grand_total_7: grand7,
      grand_total_15: grand15,
      grand_total_30: grand30,
      grand_total_60: grand60,
      grand_total_90: grand90,
    },
    sections: Array.from(sections.values()),
  })
})

export default router

