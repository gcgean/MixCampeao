/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { signAccessToken, verifyAccessToken } from '../utils/jwt.js'
import { sendError, sendOk } from '../utils/responses.js'

const router = Router()

function pgErrorCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null
  const code = (err as { code?: unknown }).code
  if (code === undefined || code === null) return null
  return String(code)
}

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }

  const { name, email, password } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const result = await pool.query<{
      id: string
      email: string
      role: 'customer' | 'admin'
    }>(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, 'customer', 'ACTIVE')
       RETURNING id, email, role`,
      [name, email, passwordHash],
    )

    const user = result.rows[0]
    const token = signAccessToken({ id: user.id, email: user.email, role: user.role })
    sendOk(res, 201, { token, user })
  } catch (err: unknown) {
    if (pgErrorCode(err) === '23505') {
      sendError(res, 409, 'CONFLICT', 'Email já cadastrado')
      return
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro ao criar conta')
  }
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.flatten())
    return
  }

  const { email, password } = parsed.data
  const result = await pool.query<{
    id: string
    email: string
    password_hash: string
    role: 'customer' | 'admin'
    status: 'ACTIVE' | 'BLOCKED'
  }>(
    `SELECT id, email, password_hash, role, status
     FROM users
     WHERE email = $1`,
    [email],
  )

  const row = result.rows[0]
  if (!row) {
    sendError(res, 401, 'UNAUTHORIZED', 'Credenciais inválidas')
    return
  }
  if (row.status !== 'ACTIVE') {
    sendError(res, 403, 'FORBIDDEN', 'Conta bloqueada')
    return
  }

  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) {
    sendError(res, 401, 'UNAUTHORIZED', 'Credenciais inválidas')
    return
  }

  const user = { id: row.id, email: row.email, role: row.role }
  const token = signAccessToken(user)
  sendOk(res, 200, { token, user })
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  sendOk(res, 200, { ok: true })
})

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const header = req.header('authorization')
  if (!header) {
    sendError(res, 401, 'UNAUTHORIZED', 'Token ausente')
    return
  }
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) {
    sendError(res, 401, 'UNAUTHORIZED', 'Formato de token inválido')
    return
  }
  try {
    const payload = verifyAccessToken(token)
    sendOk(res, 200, { user: payload })
  } catch {
    sendError(res, 401, 'UNAUTHORIZED', 'Token inválido ou expirado')
  }
})

export default router
