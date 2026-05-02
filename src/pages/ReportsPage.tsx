import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { 
  BarChart2, TrendingUp, Users, Clock as ClockIcon, 
  Banknote, CreditCard, Wallet, Gift,
  Calendar, ChevronDown, Loader2, Activity, ChevronLeft
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts'
import { supabase } from '../lib/supabase'
import { db } from '../lib/offlineDB'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../i18n'
import { Session } from '../types'
import { TopBar } from '../components/layout/TopBar'
import { format, startOfDay, subDays, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe } = useAuthStore()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')

  useEffect(() => {
    const loadData = async () => {
      if (!cafe) return
      setIsLoading(true)
      
      let startDate = startOfDay(new Date())
      if (period === 'week') startDate = subDays(startDate, 7)
      if (period === 'month') startDate = subMonths(startDate, 1)

      // Load local data first
      const localSessions = await db.sessions
          .where('status').equals('completed')
          .filter(s => new Date(s.ended_at!) >= startDate)
          .sortBy('ended_at');
      
      if (localSessions.length > 0) {
        setSessions(localSessions)
      }

      if (!navigator.onLine) {
         setIsLoading(false)
         return
      }

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('status', 'completed')
        .gte('ended_at', startDate.toISOString())
        .order('ended_at', { ascending: true })
      
      if (data) {
         setSessions(data)
         db.sessions.bulkPut(data)
      }
      setIsLoading(false)
    }

    loadData()
  }, [cafe, period])

  const stats = {
    revenue: sessions.reduce((acc, s) => acc + s.total_amount, 0),
    count: sessions.length,
    avgDuration: sessions.length > 0 
      ? Math.round(sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / sessions.length)
      : 0,
    payments: sessions.reduce((acc: any, s) => {
      const method = s.payment_method || 'other'
      acc[method] = (acc[method] || 0) + s.total_amount
      return acc
    }, {})
  }

  const itemSales = sessions.reduce((acc: Record<string, {name: string, qty: number}>, s) => {
    if (Array.isArray(s.extras)) {
      s.extras.forEach((extra: any) => {
        if (!acc[extra.id]) {
          acc[extra.id] = { name: extra.name, qty: 0 }
        }
        acc[extra.id].qty += extra.qty
      })
    }
    return acc
  }, {})

  const bestSellingItem = (Object.values(itemSales) as {name: string, qty: number}[]).sort((a, b) => b.qty - a.qty)[0]

  // Chart Data
  const chartData = sessions.reduce((acc: any[], s) => {
    const date = format(new Date(s.ended_at!), 'dd/MM')
    const existing = acc.find(d => d.date === date)
    if (existing) {
      existing.revenue += s.total_amount
    } else {
      acc.push({ date, revenue: s.total_amount })
    }
    return acc
  }, [])

  return (
    <div className="min-h-screen bg-bg pb-8">
      <TopBar />

      <main className="pt-20 px-4 space-y-6">
        {/* Period Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'today', label: t('common.today') },
            { id: 'week', label: t('common.thisWeek') },
            { id: 'month', label: t('common.thisMonth') },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                period === p.id 
                  ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' 
                  : 'bg-surface/50 text-text3 border-white/5 hover:border-white/10 glass'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Technical Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border-white/5 p-5 rounded-3xl shadow-sm relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Banknote size={12} />
                </div>
                <span className="text-[9px] font-black text-text3 uppercase tracking-[0.2em]">{t('reports.revenue') || 'Revenu'}</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-accent leading-none">
                {stats.revenue.toFixed(2)} <span className="text-[10px] opacity-60">DH</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass border-white/5 p-5 rounded-3xl shadow-sm relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-text2">
                  <Activity size={12} />
                </div>
                <span className="text-[9px] font-black text-text3 uppercase tracking-[0.2em]">Commandes</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-text leading-none">
                {stats.count} <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">Sess.</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass border-white/5 p-5 rounded-3xl shadow-sm relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-text2">
                  <ClockIcon size={12} />
                </div>
                <span className="text-[9px] font-black text-text3 uppercase tracking-[0.2em]">Moyenne</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-text leading-none">
                {stats.avgDuration} <span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">Min.</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass border-white/5 p-5 rounded-3xl shadow-sm relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
            <div className="flex flex-col gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-surface2 flex items-center justify-center text-text2">
                  <TrendingUp size={12} />
                </div>
                <span className="text-[9px] font-black text-text3 uppercase tracking-[0.2em]">Top Article</span>
              </div>
              <div className="text-xs font-bold text-text truncate leading-tight mt-1">
                {bestSellingItem ? `${bestSellingItem.name} (${bestSellingItem.qty})` : '-'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payment Breakdown */}
        <section className="space-y-4">
          <h3 className="text-[11px] font-black text-text3 uppercase tracking-[0.2em]">{t('reports.payment_breakdown')}</h3>
          <div className="glass border-white/5 rounded-3xl p-6 space-y-6">
            {[
              { id: 'cash', icon: Banknote, label: t('sessions.cash'), color: '#f97316' },
              { id: 'card', icon: CreditCard, label: t('sessions.card'), color: '#3b82f6' },
              { id: 'account', icon: Wallet, label: t('sessions.account'), color: '#8b5cf6' },
              { id: 'free', icon: Gift, label: t('sessions.free'), color: '#ef4444' },
            ].map(method => {
              const amount = stats.payments[method.id] || 0
              const percentage = stats.revenue > 0 ? (amount / stats.revenue) * 100 : 0
              return (
                <div key={method.id} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${method.color}15` }}>
                        <method.icon size={16} style={{ color: method.color }} />
                      </div>
                      <span className="text-xs font-bold text-text2 uppercase tracking-wide">{method.label}</span>
                    </div>
                    <div className="text-sm font-mono font-extrabold text-text">
                      {amount.toFixed(2)} <span className="text-[10px] opacity-60">DH</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                      style={{ backgroundColor: method.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

    </div>
  )
}
