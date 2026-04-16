import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  RefreshCw,
  Activity,
  Zap,
  CheckCircle,
  Clock,
  PlusCircle,
  List,
  Users,
  BarChart2,
  AlertTriangle,
  Banknote,
  CreditCard,
  Wallet,
  Gift,
  WifiOff
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { SessionCard } from '../components/sessions/SessionCard'
import { format } from 'date-fns'
import { useRealtime } from '../hooks/useRealtime'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type, staff } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const { addToast } = useUIStore()
  const [lastSessions, setLastSessions] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState({ revenue: 0, total: 0, completed: 0 })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useRealtime()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadStats = async () => {
    if (!cafe) return
    setIsRefreshing(true)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('cafe_id', cafe.id)
      .eq('status', 'completed')
      .gte('ended_at', today.toISOString())
      .order('ended_at', { ascending: false })
    
    if (sessions) {
      const revenue = sessions.reduce((acc, s) => acc + s.total_amount, 0)
      setTodayStats({
        revenue,
        total: sessions.length + activeSessions.length,
        completed: sessions.length
      })
      setLastSessions(sessions.slice(0, 5))
    }
    setIsRefreshing(false)
  }

  useEffect(() => {
    loadStats()
  }, [cafe, activeSessions.length])

  const hasPermission = (perm: 'reports' | 'clients') => {
    if (type === 'owner') return true
    if (!staff?.permissions) return false
    const perms = staff.permissions as any
    return perms[perm]
  }

  const hasLongSessions = activeSessions.some(s => {
    const start = new Date(s.started_at).getTime()
    const now = Date.now()
    const hours = (now - start) / 3600000
    return hours >= (cafe?.long_session_alert_hours || 3)
  })

  return (
    <div className="min-h-screen bg-bg pb-24 relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <TopBar />

      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -48 }}
            animate={{ y: 56 }}
            exit={{ y: -48 }}
            className="fixed left-0 right-0 h-12 bg-warning-dim border-b border-[rgba(245,158,11,0.2)] flex items-center justify-center gap-2 z-[90]"
          >
            <WifiOff size={14} className="text-warning" />
            <span className="text-[13px] font-medium text-warning">{t('common.offline')}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="pt-20 px-4 space-y-5 relative z-10">
        {hasLongSessions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-error-dim border border-[rgba(239,68,68,0.2)] rounded-xl flex items-center gap-3 text-error"
          >
            <AlertTriangle size={16} />
            <span className="text-[13px] font-semibold">Sessions dépassant la limite de temps</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-accent-border bg-linear-to-br from-[rgba(249,115,22,0.12)] to-[rgba(249,115,22,0.04)]"
        >
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold text-accent2 uppercase tracking-[0.08em]">
              {t('dashboard.today')}
            </span>
            <button 
              onClick={loadStats}
              className={`text-text3 hover:text-accent transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-[38px] font-mono font-extrabold text-text leading-none">
              {todayStats.revenue.toFixed(2)}
            </span>
            <span className="text-xl font-mono font-bold text-text2">DH</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="bg-surface2 border border-border px-2.5 py-1 rounded-full flex items-center gap-1.5 text-text2">
              <Activity size={12} />
              <span className="text-[11px] font-semibold font-sans">{todayStats.total} {t('dashboard.sessions')}</span>
            </div>
            <div className="bg-accent-glow border border-accent-border px-2.5 py-1 rounded-full flex items-center gap-1.5 text-accent2">
              <Zap size={12} />
              <span className="text-[11px] font-semibold font-sans">{activeSessions.length} {t('dashboard.active')}</span>
            </div>
            <div className="bg-success-dim border border-[rgba(16,185,129,0.2)] px-2.5 py-1 rounded-full flex items-center gap-1.5 text-success">
              <CheckCircle size={12} />
              <span className="text-[11px] font-semibold font-sans">{todayStats.completed} {t('dashboard.closed')}</span>
            </div>
          </div>
        </motion.div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-text flex items-center gap-2 font-sans">
              Sessions actives
              <span className="px-2 py-0.5 bg-accent-glow border border-accent-border text-accent2 rounded-full text-[11px] font-mono">
                {activeSessions.length}
              </span>
            </h2>
          </div>

          {activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 bg-surface border border-border rounded-xl text-center">
              <Clock size={36} className="text-text3 mb-3" />
              <p className="text-sm text-text font-semibold">{t('dashboard.no_sessions')}</p>
              <p className="text-[13px] text-text2 mt-1">{t('dashboard.no_sessions_sub')}</p>
              <Link to="/sessions/new" className="mt-4 btn-primary h-10 text-xs px-6">
                + {t('dashboard.new_session')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {activeSessions.map((session) => (
                  <div key={session.id}>
                    <SessionCard 
                      session={session} 
                      onEnd={(s) => navigate(`/sessions/${s.id}`)} 
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[15px] font-bold text-text font-sans">{t('dashboard.quick_actions')}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/sessions/new" className="flex flex-col items-center justify-center gap-2 h-[76px] bg-accent-glow border border-accent-border rounded-xl transition-all active:scale-95">
              <PlusCircle size={22} className="text-accent2" />
              <span className="text-[13px] font-bold text-text">{t('dashboard.new_session')}</span>
            </Link>
            <Link to="/sessions" className="flex flex-col items-center justify-center gap-2 h-[76px] bg-surface border border-border rounded-xl transition-all active:scale-95">
              <List size={22} className="text-text2" />
              <span className="text-[13px] font-bold text-text">{t('dashboard.history')}</span>
            </Link>

            <button
              onClick={() => hasPermission('clients') ? navigate('/clients') : addToast("Accès refusé", "error")}
              className={`flex flex-col items-center justify-center gap-2 h-[76px] border rounded-xl transition-all active:scale-95 ${
                hasPermission('clients') ? 'bg-surface border-border' : 'bg-surface/50 border-border opacity-50'
              }`}
            >
              <Users size={22} className="text-text2" />
              <span className="text-[13px] font-bold text-text">{t('dashboard.clients')}</span>
            </button>

            <button
              onClick={() => hasPermission('reports') ? navigate('/reports') : addToast("Accès refusé", "error")}
              className={`flex flex-col items-center justify-center gap-2 h-[76px] border rounded-xl transition-all active:scale-95 ${
                hasPermission('reports') ? 'bg-surface border-border' : 'bg-surface/50 border-border opacity-50'
              }`}
            >
              <BarChart2 size={22} className="text-text2" />
              <span className="text-[13px] font-bold text-text">{t('dashboard.report')}</span>
            </button>
          </div>
        </section>

        {lastSessions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-text font-sans">{t('dashboard.recent')}</h2>
            <div className="bg-bg2 border border-border rounded-xl overflow-hidden divide-y divide-border">
              {lastSessions.map((session) => (
                <div key={session.id} className="p-3.5 flex items-center justify-between min-h-[48px]">
                  <div className="flex items-center gap-3">
                    <div className="text-[12px] font-mono text-text3">
                      {format(new Date(session.ended_at), 'HH:mm')}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-text">
                        Place {session.seat_number} — {session.customer_name}
                      </div>
                      <div className="text-[11px] text-text3 mt-0.5">
                        {session.duration_minutes}min · {session.total_amount.toFixed(2)} DH
                      </div>
                    </div>
                  </div>
                  <div className="text-text3 opacity-60">
                    {session.payment_method === 'cash' && <Banknote size={16} />}
                    {session.payment_method === 'card' && <CreditCard size={16} />}
                    {session.payment_method === 'account' && <Wallet size={16} />}
                    {session.payment_method === 'free' && <Gift size={16} />}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
