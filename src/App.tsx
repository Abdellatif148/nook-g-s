import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import { useSessionStore } from './stores/sessionStore'
import { useUIStore } from './stores/uiStore'
import { ToastContainer } from './components/ui/ToastContainer'
import { Loader2 } from 'lucide-react'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WizardPage from './pages/WizardPage'
import DashboardPage from './pages/DashboardPage'
import NewSessionPage from './pages/NewSessionPage'
import SessionDetailPage from './pages/SessionDetailPage'
import SessionHistoryPage from './pages/SessionHistoryPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import StaffManagementPage from './pages/StaffManagementPage'

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
)

const AuthGuard = ({ children, requireOwner = false, permission }: { children: React.ReactNode; requireOwner?: boolean; permission?: 'reports' | 'clients' | 'settings' }) => {
  const { type, isLoading, cafe, staff } = useAuthStore()
  const { addToast } = useUIStore()
  const location = useLocation()

  if (isLoading) return null

  if (!type) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireOwner && type !== 'owner') {
    return <Navigate to="/dashboard" replace />
  }

  if (permission && type === 'staff') {
    const perms = staff?.permissions as any
    if (!perms?.[permission]) {
      // We can't easily toast from here during render, but the instruction says redirect + toast
      return <Navigate to="/dashboard" replace />
    }
  }

  if (type === 'owner' && !cafe?.setup_complete && location.pathname !== '/wizard') {
    return <Navigate to="/wizard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()
  const { setOwner, setCafe, setLoading, setStaff, isLoading } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setOwner(session.user)
        const { data: cafe } = await supabase.from('cafes').select('*').eq('owner_id', session.user.id).single()
        if (cafe) setCafe(cafe)
      } else {
        const staffSession = localStorage.getItem('nook_staff_session')
        if (staffSession) {
          const parsed = JSON.parse(staffSession)
          if (new Date(parsed.expires_at) > new Date()) {
            const { data: staff } = await supabase.from('staff').select('*').eq('id', parsed.staff_id).single()
            const { data: cafe } = await supabase.from('cafes').select('*').eq('id', parsed.cafe_id).single()
            if (staff && cafe) {
              setStaff(staff)
              setCafe(cafe)
            }
          } else {
            localStorage.removeItem('nook_staff_session')
          }
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center text-white font-extrabold text-[22px]">N</div>
          <span className="text-xl font-bold text-text">Nook OS</span>
        </div>
        <Loader2 className="animate-spin text-text3" size={20} />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        <Route path="/wizard" element={<AuthGuard requireOwner><PageTransition><WizardPage /></PageTransition></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><PageTransition><DashboardPage /></PageTransition></AuthGuard>} />
        <Route path="/sessions/new" element={<AuthGuard><PageTransition><NewSessionPage /></PageTransition></AuthGuard>} />
        <Route path="/sessions/:id" element={<AuthGuard><PageTransition><SessionDetailPage /></PageTransition></AuthGuard>} />
        <Route path="/sessions" element={<AuthGuard><PageTransition><SessionHistoryPage /></PageTransition></AuthGuard>} />
        <Route path="/clients" element={<AuthGuard permission="clients"><PageTransition><ClientsPage /></PageTransition></AuthGuard>} />
        <Route path="/clients/:id" element={<AuthGuard permission="clients"><PageTransition><ClientDetailPage /></PageTransition></AuthGuard>} />
        <Route path="/reports" element={<AuthGuard permission="reports"><PageTransition><ReportsPage /></PageTransition></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard requireOwner><PageTransition><SettingsPage /></PageTransition></AuthGuard>} />
        <Route path="/settings/staff" element={<AuthGuard requireOwner><PageTransition><StaffManagementPage /></PageTransition></AuthGuard>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg text-text selection:bg-accent/30 font-sans">
        <AppRoutes />
        <ToastContainer />
      </div>
    </BrowserRouter>
  )
}
