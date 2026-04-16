import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  BarChart2, Activity, Clock,
  Download, Banknote, CreditCard, Wallet, Gift,
  ChevronDown, FileText
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../hooks/useTranslation'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { Button } from '../components/ui/Button'
import { generateReportPDF } from '../lib/pdf'
import { format, startOfDay, subDays, subMonths } from 'date-fns'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { cafe } = useAuthStore()
  
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [showFiscal, setShowFiscal] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!cafe) return
      setIsLoading(true)
      
      let startDate = startOfDay(new Date())
      if (period === 'week') startDate = subDays(startDate, 7)
      if (period === 'month') startDate = subMonths(startDate, 1)

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('status', 'completed')
        .gte('ended_at', startDate.toISOString())
        .order('ended_at', { ascending: true })
      
      if (data) setSessions(data)
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

  const chartData = sessions.reduce((acc: any[], s) => {
    const date = format(new Date(s.ended_at!), period === 'today' ? 'HH:00' : 'dd/MM')
    const existing = acc.find(d => d.date === date)
    if (existing) {
      existing.revenue += s.total_amount
    } else {
      acc.push({ date, revenue: s.total_amount })
    }
    return acc
  }, [])

  const handleExport = () => {
    if (!cafe) return
    const periodLabel = period === 'today' ? "Aujourd'hui" : period === 'week' ? "7 derniers jours" : "30 derniers jours"
    generateReportPDF(cafe, sessions, periodLabel)
  }

  return (
    <div className="min-h-screen bg-bg relative pb-24">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center px-4">
        <h1 className="text-base font-bold text-text">{t('reports.title')}</h1>
      </header>

      <main className="pt-20 px-4 space-y-6 relative z-10">
        {/* PERIOD CHIPS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sticky top-[56px] bg-bg z-20">
          {[
            { id: 'today', label: t('common.today') },
            { id: 'week', label: t('common.thisWeek') },
            { id: 'month', label: t('common.thisMonth') },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                period === p.id 
                  ? 'bg-accent-glow text-accent2 border-accent-border'
                  : 'bg-surface border-border text-text3 hover:border-text2'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* REVENUE SUMMARY CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl border border-accent-border bg-linear-to-br from-[rgba(249,115,22,0.12)] to-transparent"
        >
          <div className="text-[11px] font-bold text-accent2 uppercase tracking-widest mb-1.5">{t('reports.revenue')}</div>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-[38px] font-mono font-extrabold text-text leading-none">{stats.revenue.toFixed(2)}</span>
            <span className="text-xl font-mono font-bold text-text2">DH</span>
          </div>
          <div className="text-[13px] text-text2 font-medium">
            {stats.count} {t('reports.sessions')} · {stats.avgDuration}min {t('reports.avg_duration')} · {(stats.revenue / (stats.count || 1)).toFixed(2)} DH/session
          </div>
        </motion.div>

        {/* CHART */}
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'var(--accent-glow)' }}
                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--accent2)', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                labelStyle={{ color: 'var(--text2)', marginBottom: '4px', fontSize: '10px' }}
              />
              <Bar dataKey="revenue" fill="var(--accent)" opacity={0.8} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PAYMENT BREAKDOWN */}
        <section className="space-y-3">
          <h3 className="text-[15px] font-bold text-text">{t('reports.payment_breakdown')}</h3>
          <div className="space-y-2">
            {[
              { id: 'cash', icon: Banknote, label: t('sessions.cash') },
              { id: 'card', icon: CreditCard, label: t('sessions.card') },
              { id: 'account', icon: Wallet, label: t('sessions.account') },
              { id: 'free', icon: Gift, label: t('sessions.free') },
            ].map(method => {
              const amount = stats.payments[method.id] || 0
              const percentage = stats.revenue > 0 ? (amount / stats.revenue) * 100 : 0
              return (
                <div key={method.id} className="card p-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-text">
                      <method.icon size={16} className="text-text3" />
                      {method.label}
                    </div>
                    <div className="text-right">
                      <span className="text-[14px] font-mono font-bold text-text">{amount.toFixed(2)} DH</span>
                      <span className="text-[11px] text-text3 ml-2">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-accent" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* FISCAL SECTION */}
        <section className="mt-4">
          <button
            onClick={() => setShowFiscal(!showFiscal)}
            className="w-full h-12 flex items-center justify-between px-4 bg-surface border border-border rounded-xl"
          >
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-text2" />
              <span className="text-[14px] font-semibold text-text">{t('reports.fiscal') || 'Données fiscales'}</span>
            </div>
            <ChevronDown size={16} className={`text-text3 transition-transform ${showFiscal ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showFiscal && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 bg-surface2 border-x border-b border-border rounded-b-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text2">HT</span>
                    <span className="font-mono text-text">{(stats.revenue / 1.2).toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text2">TVA (20%)</span>
                    <span className="font-mono text-text">{(stats.revenue * 0.2 / 1.2).toFixed(2)} DH</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between font-bold">
                    <span className="text-text">TTC</span>
                    <span className="font-mono text-accent2">{stats.revenue.toFixed(2)} DH</span>
                  </div>
                  <Button className="w-full h-10 mt-2 text-xs" onClick={handleExport}>
                    <Download size={14} /> {t('reports.download') || 'Télécharger le rapport'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
