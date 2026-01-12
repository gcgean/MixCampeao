import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from '@/pages/Home'
import AuthPage from '@/pages/Auth'
import SegmentPage from '@/pages/Segment'
import SegmentLanding from '@/pages/SegmentLanding'
import MyAccess from '@/pages/MyAccess'
import AdminPage from '@/pages/Admin'
import Layout from '@/components/Layout'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { isAdmin } from '@/utils/api'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, hydrated, hydrate } = useAuthStore()
  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])
  if (!hydrated) return null
  if (!user) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, hydrated, hydrate } = useAuthStore()
  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])
  if (!hydrated) return null
  if (!user) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />
  if (!isAdmin(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { hydrated, hydrate } = useAuthStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<AuthPage />} />
          <Route path="/s/:slug" element={<SegmentLanding />} />
          <Route path="/segmentos/:slug" element={<SegmentPage />} />
          <Route
            path="/meus-acessos"
            element={
              <RequireAuth>
                <MyAccess />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}
