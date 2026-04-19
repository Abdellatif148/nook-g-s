import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import { useSessionStore } from './stores/sessionStore'
import { useUIStore } from './stores/uiStore'
import { Loader2 } from 'lucide-react'
import { ToastContainer } from './components/ui/Toast'
import { OfflineBanner } from './shared/components/OfflineBanner'
import { PermissionGate } from './components/ui/PermissionGate'

// Lazy load pages
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const WizardPage = lazy(() => import('./pages/WizardPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NewSessionPage = lazy(() => import('./pages/NewSessionPage'))
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'))
const SessionHistoryPage = lazy(() => import('./pages/SessionHistoryPage'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const StaffManagementPage = lazy(() => import('./pages/StaffManagementPage'))
const ProductManagementPage = lazy(() => import('./pages/ProductManagementPage'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-bg">
    <Loader2 size={24} className="text-text3 animate-spin" />
  </div>
)

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
    className="min-h-screen"
  >
    {children}
  </motion.div>
)

const AuthGuard = ({ children, requireOwner = false }: { children: React.ReactNode; requireOwner?: boolean }) => {
  const { type, isLoading, cafe } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center"
        >
          <img src="/favicon.svg" className="w-16 h-16 mb-4 drop-shadow-lg" alt="Nook OS" />
          <h1 className="text-2xl font-bold text-text mb-6">Nook OS</h1>
          <Loader2 size={24} className="text-text3 animate-spin" />
        </motion.div>
      </div>
    )
  }

  if (!type) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireOwner && type !== 'owner') {
    return <Navigate to="/dashboard" replace />
  }

  if (type === 'owner' && !cafe?.setup_complete && location.pathname !== '/wizard') {
    return <Navigate to="/wizard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()
  const { setOwner, setCafe, setLoading, setStaff } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      
      // Removed 1500ms synthetic delay to improve LCP/TTFB response
      
      try {
        // 1. Check Supabase Auth (Owner)
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setOwner(session.user)
          const { data: cafe } = await supabase
            .from('cafes')
            .select('*')
            .eq('owner_id', session.user.id)
            .single()
          
          if (cafe) setCafe(cafe)
        } else {
          // 2. Check Local Storage (Staff)
          const staffSession = localStorage.getItem('nook_staff_session')
          if (staffSession) {
            try {
              const parsed = JSON.parse(staffSession)
              if (new Date(parsed.expires_at) > new Date()) {
                const { data: staff } = await supabase
                  .from('staff')
                  .select('*')
                  .eq('id', parsed.staff_id)
                  .single()

                const { data: cafe } = await supabase
                  .from('cafes')
                  .select('*')
                  .eq('id', parsed.cafe_id)
                  .single()

                if (staff && cafe) {
                  setStaff(staff)
                  setCafe(cafe)
                }
              } else {
                localStorage.removeItem('nook_staff_session')
              }
            } catch {
              localStorage.removeItem('nook_staff_session')
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setOwner(session.user)
      } else {
        setOwner(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

          <Route path="/wizard" element={
            <AuthGuard requireOwner>
              <PageTransition><WizardPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/dashboard" element={
            <AuthGuard>
              <PageTransition><DashboardPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/sessions/new" element={
            <AuthGuard>
              <PageTransition><NewSessionPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/sessions/:id" element={
            <AuthGuard>
              <PageTransition><SessionDetailPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/sessions" element={
            <AuthGuard>
              <PageTransition><SessionHistoryPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/clients" element={
            <AuthGuard>
              <PermissionGate permission="clients">
                <PageTransition><ClientsPage /></PageTransition>
              </PermissionGate>
            </AuthGuard>
          } />

          <Route path="/clients/:id" element={
            <AuthGuard>
              <PermissionGate permission="clients">
                <PageTransition><ClientDetailPage /></PageTransition>
              </PermissionGate>
            </AuthGuard>
          } />

          <Route path="/reports" element={
            <AuthGuard>
              <PermissionGate permission="reports">
                <PageTransition><ReportsPage /></PageTransition>
              </PermissionGate>
            </AuthGuard>
          } />

          <Route path="/settings" element={
            <AuthGuard>
              <PermissionGate permission="settings">
                <PageTransition><SettingsPage /></PageTransition>
              </PermissionGate>
            </AuthGuard>
          } />

          <Route path="/settings/staff" element={
            <AuthGuard requireOwner>
              <PageTransition><StaffManagementPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/settings/audit" element={
            <AuthGuard requireOwner>
              <PageTransition><AuditLogPage /></PageTransition>
            </AuthGuard>
          } />

          <Route path="/settings/products" element={
            <AuthGuard>
              <PermissionGate permission="settings">
                <PageTransition><ProductManagementPage /></PageTransition>
              </PermissionGate>
            </AuthGuard>
          } />

          <Route path="/" element={<PageTransition><WelcomePage /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text selection:bg-accent/30">
        <OfflineBanner />
        <AppRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  )
}
