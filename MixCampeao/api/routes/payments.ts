import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { sendError, sendOk } from '../utils/responses.js'
import { createMockPixCharge, generateTxid, signWebhookPayload } from '../utils/pix.js'

const router = Router()

router.post('/pix/create', requireAuth, async (req: Request, res: Response) => {
  const schema = z.object({
    segmentSlug: z.string().min(1),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }

  const { segmentSlug } = parsed.data
  const segmentRes = await pool.query<{
    id: string
    slug: string
    name: string
    price_pix: string
    active: boolean
  }>(
    `SELECT id, slug, name, price_pix, active
     FROM segments
     WHERE slug = $1`,
    [segmentSlug],
  )
  const segment = segmentRes.rows[0]
  if (!segment || !segment.active) {
    sendError(res, 404, 'NOT_FOUND', 'Segmento não encontrado')
    return
  }

  const alreadyRes = await pool.query<{ ok: boolean }>(
    `SELECT true as ok
     FROM purchases
     WHERE user_id = $1 AND segment_id = $2 AND status = 'PAID'
     LIMIT 1`,
    [req.user?.id, segment.id],
  )
  if (alreadyRes.rowCount > 0) {
    sendError(res, 409, 'CONFLICT', 'Você já possui acesso a este segmento')
    return
  }

  const amount = Number(segment.price_pix)
  const txid = generateTxid()
  const charge = await createMockPixCharge(txid, amount)

  const insertRes = await pool.query<{ id: string }>(
    `INSERT INTO purchases (user_id, segment_id, status, amount, txid, pix_payload)
     VALUES ($1, $2, 'PENDING', $3, $4, $5)
     RETURNING id`,
    [req.user?.id, segment.id, amount, txid, charge.copyPaste],
  )

  sendOk(res, 201, {
    purchaseId: insertRes.rows[0]?.id,
    txid: charge.txid,
    status: 'PENDING',
    amount,
    copyPaste: charge.copyPaste,
    qrCodeDataUrl: charge.qrCodeDataUrl,
    expiresAt: charge.expiresAt,
  })
})

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id
  const result = await pool.query<{
    id: string
    status: string
    amount: string
    txid: string
    paid_at: string | null
  }>(
    `SELECT id, status, amount, txid, paid_at
     FROM purchases
     WHERE id = $1 AND user_id = $2`,
    [id, req.user?.id],
  )
  const purchase = result.rows[0]
  if (!purchase) {
    sendError(res, 404, 'NOT_FOUND', 'Pagamento não encontrado')
    return
  }
  sendOk(res, 200, {
    ...purchase,
    amount: Number(purchase.amount),
  })
})

router.post('/pix/webhook', async (req: Request, res: Response) => {
  const signature = req.header('x-psp-signature')
  const rawBody = req.rawBody
  if (!signature || !rawBody) {
    sendError(res, 401, 'UNAUTHORIZED', 'Assinatura ausente')
    return
  }
  const expected = signWebhookPayload(rawBody)
  if (signature !== expected) {
    sendError(res, 401, 'UNAUTHORIZED', 'Assinatura inválida')
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    sendError(res, 400, 'VALIDATION_ERROR', 'JSON inválido')
    return
  }

  const schema = z.object({
    txid: z.string().min(1),
    status: z.enum(['PAID', 'PENDING', 'EXPIRED', 'CANCELED', 'REFUNDED']).optional(),
  })
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload inválido', parsed.error.flatten())
    return
  }

  const { txid } = parsed.data
  const status = parsed.data.status ?? 'PAID'
  if (status !== 'PAID') {
    sendOk(res, 200, { ok: true })
    return
  }

  await pool.query(
    `UPDATE purchases
     SET status = 'PAID', paid_at = COALESCE(paid_at, now()), pix_payload = $2
     WHERE txid = $1 AND status <> 'PAID'`,
    [txid, rawBody.toString('utf8')],
  )

  sendOk(res, 200, { ok: true })
})

export default router

