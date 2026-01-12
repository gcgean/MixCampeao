import jwt from 'jsonwebtoken'
import { requiredEnv } from './env.js'

export type JwtUser = {
  id: string
  email: string
  role: 'customer' | 'admin'
}

const jwtSecret = requiredEnv('JWT_SECRET')

export function signAccessToken(user: JwtUser): string {
  return jwt.sign(user, jwtSecret, { algorithm: 'HS256', expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtUser {
  const payload = jwt.verify(token, jwtSecret)
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid token payload')
  }
  const p = payload as Record<string, unknown>
  return {
    id: String(p.id),
    email: String(p.email),
    role: p.role === 'admin' ? 'admin' : 'customer',
  }
}

