import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import Button from '@/components/Button'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/utils/api'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, hydrated } = useAuthStore()
  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1020]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-semibold tracking-wide">
            Mix Campeão
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white',
                  isActive && 'bg-white/10 text-white',
                )
              }
            >
              Segmentos
            </NavLink>
            {hydrated && user && (
              <NavLink
                to="/meus-acessos"
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white/10 text-white',
                  )
                }
              >
                Meus acessos
              </NavLink>
            )}
            {hydrated && isAdmin(user) && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white/10 text-white',
                  )
                }
              >
                Admin
              </NavLink>
            )}
            <div className="w-px self-stretch bg-white/10" />
            {!user ? (
              <Link to="/entrar">
                <Button variant="secondary" size="sm">
                  Entrar
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="sm" onClick={logout}>
                Sair
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-white/10 py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-white/50">
          Mix Campeão © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}

