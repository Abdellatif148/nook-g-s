import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Search, Banknote, CreditCard,
  Wallet, Gift, Clock, ClipboardX
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../hooks/useTranslation'
import { format, isToday, isYesterday, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { Input } from '../components/ui/Input'

export default function SessionHistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe } = useAuthStore()
  
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')

  useEffect(() => {
    const loadSessions = async () => {
      if (!cafe) return
      setIsLoading(true)
      
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
      
      if (period === 'today') {
        query = query.gte('ended_at', startOfDay(new Date()).toISOString())
      } else if (period === 'week') {
        query = query.gte('ended_at', startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString())
      } else if (period === 'month') {
        query = query.gte('ended_at', startOfMonth(new Date()).toISOString())
      }

      const { data } = await query
      if (data) setSessions(data)
      setIsLoading(false)
    }

    loadSessions()
  }, [cafe, period])

  const filteredSessions = sessions.filter(s => 
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.seat_number.toString().includes(search)
  )

  const groupedSessions = filteredSessions.reduce((acc: Record<string, any[]>, session) => {
    const date = format(new Date(session.ended_at!), 'yyyy-MM-dd')
    if (!acc[date]) acc[date] = []
    acc[date].push(session)
    return acc
  }, {})

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return "Aujourd'hui"
    if (isYesterday(date)) return "Hier"
    return format(date, 'EEE dd MMM', { locale: fr }).replace('.', '')
  }

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case 'cash': return <Banknote size={16} />
      case 'card': return <CreditCard size={16} />
      case 'account': return <Wallet size={16} />
      case 'free': return <Gift size={16} />
      default: return null
    }
  }

  const periodStats = {
    count: filteredSessions.length,
    revenue: filteredSessions.reduce((acc, s) => acc + s.total_amount, 0),
    avg: filteredSessions.length > 0 ? Math.round(filteredSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / filteredSessions.length) : 0
  }

  return (
    <div className="min-h-screen bg-bg relative pb-24">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <h1 className="text-base font-bold text-text">{t('session.history') || 'Historique'}</h1>
        <button onClick={() => setShowSearch(!showSearch)} className={`p-2 -mr-2 transition-colors ${showSearch ? 'text-accent' : 'text-text2'}`}>
          <Search size={20} />
        </button>
      </header>

      <main className="pt-14 relative z-10">
        {/* STICKY FILTER */}
        <div className="sticky top-14 bg-bg/95 backdrop-blur-sm z-[90] border-b border-border/50 py-3 px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'today', label: t('reports.today') },
              { id: 'week', label: t('reports.week') },
              { id: 'month', label: t('reports.month') },
              { id: 'all', label: t('reports.all') || 'Tout' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  period === p.id
                    ? 'bg-accent-glow text-accent2 border-accent-border'
                    : 'bg-surface border-border text-text3'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 44, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
                <Input
                  autoFocus
                  placeholder="Rechercher..."
                  icon={<Search size={14} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 py-5 space-y-6">
          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: `${periodStats.count} sessions`, value: 'Activités', color: 'text-text' },
              { label: 'Total période', value: `${periodStats.revenue.toFixed(2)} DH`, color: 'text-text' },
              { label: 'Durée moyenne', value: `${periodStats.avg}min`, color: 'text-text' }
            ].map((s, i) => (
              <div key={i} className="bg-surface border border-border rounded-[10px] p-3">
                <div className="text-[10px] text-text3 font-medium uppercase truncate">{s.label}</div>
                <div className={`text-[15px] font-mono font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* LIST */}
          <div className="space-y-8">
            {Object.entries(groupedSessions).map(([date, daySessions]: [string, any]) => (
              <div key={date}>
                <div className="bg-bg2 border-b border-border py-2 px-4 -mx-4 sticky top-[118px] z-10 flex justify-between items-center">
                  <span className="text-[12px] font-bold text-text uppercase tracking-wider">{formatDateHeader(date)}</span>
                  <span className="text-[13px] font-mono font-bold text-accent2">
                    {daySessions.reduce((acc: number, s: any) => acc + s.total_amount, 0).toFixed(2)} DH
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {daySessions.map((session: any) => (
                    <motion.div
                      key={session.id}
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="py-3.5 flex items-center justify-between active:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-[12px] font-mono text-text3 w-10">
                          {format(new Date(session.ended_at!), 'HH:mm')}
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
                        {getPaymentIcon(session.payment_method)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {filteredSessions.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardX size={36} className="text-text3 mb-3" />
                <p className="text-sm text-text3">Aucune session trouvée</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
