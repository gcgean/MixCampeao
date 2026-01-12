import { Router, type Request, type Response } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { sendOk } from '../utils/responses.js'

const router = Router()

router.get('/segments', requireAuth, async (req: Request, res: Response) => {
  const result = await pool.query<{
    id: string
    code: string
    slug: string
    name: string
    price_pix: string
    paid_at: string
  }>(
    `SELECT s.id, s.code, s.slug, s.name, s.price_pix, p.paid_at
     FROM purchases p
     JOIN segments s ON s.id = p.segment_id
     WHERE p.user_id = $1 AND p.status = 'PAID'
     ORDER BY p.paid_at DESC`,
    [req.user?.id],
  )

  sendOk(res, 200, {
    segments: result.rows.map((r) => ({
      ...r,
      price_pix: Number(r.price_pix),
    })),
  })
})

export default router

