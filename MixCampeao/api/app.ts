/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import segmentsRoutes from './routes/segments.js'
import meRoutes from './routes/me.js'
import paymentsRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'
import { sendError } from './utils/responses.js'

// load env
dotenv.config({ override: true })

const app: express.Application = express()

app.use(cors())
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      ;(req as unknown as { rawBody?: Buffer }).rawBody = buf
    },
  }),
)
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/segments', segmentsRoutes)
app.use('/api/me', meRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/admin', adminRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  void error
  void next
  sendError(res, 500, 'INTERNAL_ERROR', 'Server internal error')
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  sendError(res, 404, 'NOT_FOUND', 'API not found')
})

export default app
