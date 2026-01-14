import { create } from 'zustand'
import { apiFetch } from '@/utils/api'

export type AuthUser = {
  id: string
  email: string
  role: 'customer' | 'admin'
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  hydrated: boolean
  hydrate: () => void
  logout: () => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  refreshMe: () => Promise<void>
}

const STORAGE_KEY = 'mixcampeao_auth'

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        set({ hydrated: true })
        return
      }
      const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser }
      set({ token: parsed.token || null, user: parsed.user || null, hydrated: true })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      set({ token: null, user: null, hydrated: true })
    }
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ token: null, user: null })
  },
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, user: data.user }))
    set({ token: data.token, user: data.user })
  },
  register: async (name: string, email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, user: data.user }))
    set({ token: data.token, user: data.user })
  },
  refreshMe: async () => {
    const token = get().token
    if (!token) return
    const data = await apiFetch<{ user: AuthUser }>('/auth/me', {
      token,
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: data.user }))
    set({ user: data.user })
  },
}))

