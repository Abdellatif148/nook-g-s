import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  BarChart2, TrendingUp, Activity,
  Download as DownloadIcon, Loader2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from '../../i18n'
import { Session } from '../../types'
import { TopBar } from '../../components/layout/TopBar'
import { BottomNav } from '../../components/layout/BottomNav'
import { format, startOfDay, subDays, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { cafe } = useAuthStore()

  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')

  useEffect(() => {
    const loadData = async () => {
      if (!cafe) return
      setIsLoading(true)

      let startDate = startOfDay(new Date())
      if (period === 'week') startDate = startOfDay(subDays(new Date(), 7))
      if (period === 'month') startDate = startOfDay(subMonths(new Date(), 1))

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('status', 'completed')
        .gte('ended_at', startDate.toISOString())
        .order('ended_at', { ascending: true }) as any

      if (data) setSessions(data)
      setIsLoading(false)
    }

    loadData()
  }, [cafe, period])

  const stats = {
    revenue: sessions.reduce((acc, s) => acc + s.total_amount, 0),
    count: sessions.length
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <TopBar />
      <main className="pt-20 px-4 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <BarChart2 size={24} className="text-accent" />
            {t('reports.title')}
          </h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-text outline-none"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">7 jours</option>
            <option value="month">30 jours</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-surface border border-border rounded-2xl">
            <div className="flex items-center gap-2 text-text3 mb-2">
              <TrendingUp size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Revenus</span>
            </div>
            <div className="text-xl font-mono font-bold text-text">
              {stats.revenue.toFixed(2)} DH
            </div>
          </div>
          <div className="p-4 bg-surface border border-border rounded-2xl">
            <div className="flex items-center gap-2 text-text3 mb-2">
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sessions</span>
            </div>
            <div className="text-xl font-mono font-bold text-text">
              {stats.count}
            </div>
          </div>
        </div>

        <section className="p-6 bg-surface border border-border rounded-2xl">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-text3 uppercase tracking-widest">Activité récente</h3>
            <button className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-widest">
              <DownloadIcon size={14} />
              Exporter
            </button>
          </div>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {sessions.slice(-10).reverse().map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-text">{s.customer_name}</div>
                  <div className="text-[10px] text-text3">
                    {format(new Date(s.ended_at!), 'dd MMM HH:mm', { locale: fr })}
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-accent2">
                  {s.total_amount.toFixed(2)} DH
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  )
}
