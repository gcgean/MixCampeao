import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Card from '@/components/Card'
import Input from '@/components/Input'
import Button from '@/components/Button'
import { ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

function useRedirectPath() {
  const location = useLocation()
  return useMemo(() => {
    const state = location.state as { from?: unknown } | null
    const fromState = state?.from
    if (typeof fromState === 'string' && fromState.startsWith('/')) return fromState
    return '/'
  }, [location.state])
}

export default function AuthPage() {
  const navigate = useNavigate()
  const redirectTo = useRedirectPath()
  const { login, register } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name || 'Cliente', email, password)
      }
      navigate(redirectTo)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-4 sm:p-6">
        <div className="mb-4">
          <div className="text-lg font-semibold">{mode === 'login' ? 'Entrar' : 'Criar conta'}</div>
          <div className="mt-1 text-sm text-white/60">Acesso por email e senha.</div>
        </div>

        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={mode === 'login' ? 'primary' : 'secondary'}
            className="flex-1"
            onClick={() => setMode('login')}
          >
            Entrar
          </Button>
          <Button
            type="button"
            variant={mode === 'register' ? 'primary' : 'secondary'}
            className="flex-1"
            onClick={() => setMode('register')}
          >
            Criar conta
          </Button>
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs text-white/60">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-white/60">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              inputMode="email"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Senha</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm">{error}</div>}
          <Button type="button" onClick={onSubmit} disabled={loading} className="w-full">
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
