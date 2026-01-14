export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export function sendError(
  res: { status: (n: number) => { json: (v: unknown) => unknown } },
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  const body: {
    error: {
      code: ApiErrorCode
      message: string
      details?: unknown
    }
  } = {
    error: {
      code,
      message,
    },
  }
  if (details !== undefined) body.error.details = details
  return res.status(status).json(body)
}

export function sendOk(
  res: { status: (n: number) => { json: (v: unknown) => unknown } },
  status: number,
  data: unknown,
) {
  return res.status(status).json(data)
}

