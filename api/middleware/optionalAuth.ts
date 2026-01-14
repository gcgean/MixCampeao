import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization')
  if (!header) return next()
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) return next()
  try {
    req.user = verifyAccessToken(token)
  } catch {
    req.user = undefined
  }
  return next()
}

