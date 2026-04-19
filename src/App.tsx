import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import { useUIStore } from './stores/uiStore'
import { processSyncQueue } from './lib/offline/sync'
import { Loader2 } from 'lucide-react'
import { ToastContainer } from './components/ui/Toast'
import { ConnectivityBanner } from './components/layout/ConnectivityBanner'

// Features
import WelcomePage from './features/auth/WelcomePage'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import WizardPage from './features/settings/WizardPage'
import DashboardPage from './features/sessions/DashboardPage'
import NewSessionPage from './features/sessions/NewSessionPage'
import SessionDetailPage from './features/sessions/SessionDetailPage'
import SessionHistoryPage from './features/sessions/SessionHistoryPage'
import ClientsPage from './features/clients/ClientsPage'
import ClientDetailPage from './features/clients/ClientDetailPage'
import ReportsPage from './features/reports/ReportsPage'
import SettingsPage from './features/settings/SettingsPage'
import StaffManagementPage from './features/staff/StaffManagementPage'
import ProductManagementPage from './features/products/ProductManagementPage'
import AuditLogPage from './features/settings/AuditLogPage'
import { PermissionGate } from './components/ui/PermissionGate'

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
  const { setOwner, setCafe, setLoading, setStaff, logout } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      
      let session = null;
      try {
        const { data } = await supabase.auth.getSession()
        session = data.session;
      } catch (e) {
        console.warn("Failed to get session online", e);
      }
      
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 1000))
      
      let authPromise = (async () => {
        try {
          if (session?.user) {
            setOwner(session.user)
            const { data: cafe } = await supabase
              .from('cafes')
              .select('*')
              .eq('owner_id', session.user.id)
              .single()
            
            if (cafe) setCafe(cafe)
          } else {
            const staffSession = localStorage.getItem('nook_staff_session')
            if (staffSession) {
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
              }
            }
          }
        } catch (e) {}
      })();

      await Promise.all([authPromise, minLoadTime])
      setLoading(false)
      
      if (navigator.onLine) {
        processSyncQueue();
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
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text selection:bg-accent/30">
<ConnectivityBanner />
        <AppRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  )
}
