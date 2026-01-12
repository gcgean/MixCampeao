import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../utils/responses.js'

export function requireRole(role: 'admin' | 'customer') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) return sendError(res, 401, 'UNAUTHORIZED', 'Não autenticado')
    if (user.role !== role) return sendError(res, 403, 'FORBIDDEN', 'Acesso negado')
    return next()
  }
}

