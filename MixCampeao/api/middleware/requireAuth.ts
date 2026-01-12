import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { sendError } from '../utils/responses.js'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization')
  if (!header) return sendError(res, 401, 'UNAUTHORIZED', 'Token ausente')

  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Formato de token inválido')
  }

  try {
    req.user = verifyAccessToken(token)
    return next()
  } catch {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token inválido ou expirado')
  }
}

