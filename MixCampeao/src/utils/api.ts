import { type AuthUser } from '@/stores/authStore'

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export class ApiError extends Error {
  code: string
  details?: unknown
  status: number

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function apiBase(): string {
  const base = import.meta.env.VITE_API_BASE
  return base || '/api'
}

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string
    body?: unknown
    token?: string | null
    headers?: Record<string, string>
  },
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: options?.method || 'GET',
    headers: {
      ...(options?.headers || {}),
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (res.ok) {
    return (await res.json()) as T
  }

  let parsed: ApiErrorBody | null = null
  try {
    parsed = (await res.json()) as ApiErrorBody
  } catch {
    parsed = null
  }
  const code = parsed?.error?.code || 'HTTP_ERROR'
  const message = parsed?.error?.message || `Erro HTTP ${res.status}`
  const details = parsed?.error?.details
  throw new ApiError(res.status, code, message, details)
}

export async function uploadMultipart<T>(
  path: string,
  formData: FormData,
  options?: { token?: string | null },
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: formData,
  })
  if (res.ok) {
    return (await res.json()) as T
  }
  let parsed: ApiErrorBody | null = null
  try {
    parsed = (await res.json()) as ApiErrorBody
  } catch {
    parsed = null
  }
  const code = parsed?.error?.code || 'HTTP_ERROR'
  const message = parsed?.error?.message || `Erro HTTP ${res.status}`
  const details = parsed?.error?.details
  throw new ApiError(res.status, code, message, details)
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

