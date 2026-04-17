import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft,
  MoreVertical,
  Clock,
  Gauge,
  AlertCircle,
  ShoppingBag,
  Plus,
  Trash2,
  StopCircle,
  X,
  Minus,
  Banknote,
  CreditCard,
  Wallet,
  Gift,
  CheckCircle,
  AlertTriangle,
  Search,
  TrendingDown,
  Users,
  Armchair
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { Button } from '../components/ui/Button'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input } from '../components/ui/Input'
import { format } from 'date-fns'

export default function SessionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { cafe, type, owner, staff } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const { addToast } = useUIStore()

  const [session, setSession] = useState<any>(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [timeCost, setTimeCost] = useState(0)
  const [isLong, setIsLong] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnding, setIsEnding] = useState(false)
  
  const [showExtras, setShowExtras] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})

  // End session flow
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [receivedAmount, setReceivedAmount] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [linkedClient, setLinkedClient] = useState<any>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])
  const fetchLinkedClient = async (clientId: string) => {
    const { data } = await supabase.from("client_accounts").select("*").eq("id", clientId).single()
    if (data) setLinkedClient(data)
  }

  const loadSession = async () => {
    const active = activeSessions.find(s => s.id === id)
    if (active) {
      setSession(active); if (active.client_account_id) fetchLinkedClient(active.client_account_id)
    } else {
      const { data } = await supabase.from('sessions').select('*').eq('id', id).single()
      setSession(data); if (data?.client_account_id) fetchLinkedClient(data.client_account_id)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadSession()
  }, [id, activeSessions])

  useEffect(() => {
    if (session?.status !== 'active') return

    const update = () => {
      const start = new Date(session.started_at).getTime()
      const now = Date.now()
      const diffSec = Math.floor((now - start) / 1000)
      
      const hours = Math.floor(diffSec / 3600)
      const minutes = Math.floor((diffSec % 3600) / 60)
      const seconds = diffSec % 60
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      
      const rate = Number(session.rate_per_hour) || 0
      let billableMinutes = diffSec / 60; const increment = cafe?.billing_increment || "minute"; if (increment === "15min") billableMinutes = Math.ceil(billableMinutes / 15) * 15; else if (increment === "30min") billableMinutes = Math.ceil(billableMinutes / 30) * 30; else if (increment === "hour") billableMinutes = Math.ceil(billableMinutes / 60) * 60; const cost = (billableMinutes / 60) * rate
      setTimeCost(cost)

      const alertLimit = Number(cafe?.long_session_alert_hours) || 3
      if (Number(hours) >= Number(alertLimit)) setIsLong(true)
    }

    update()
    const interval = setInterval(update, 1000)
    const handleVisibility = () => { if (document.visibilityState === 'visible') update() }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  useEffect(() => {
    if (!id) return
    const channel = supabase.channel(`session-detail-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` }, (payload) => {
        setSession(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])
  }, [session, cafe])

  useEffect(() => {
    if (showExtras) {
      const loadProducts = async () => {
        const { data } = await supabase.from('products').select('*').eq('cafe_id', cafe?.id).eq('active', true).order('sort_order')
        if (data) setProducts(data)
      }
      loadProducts()
    }
  }, [showExtras, cafe])

  useEffect(() => {
    if (clientSearch.length >= 2) {
      const searchClients = async () => {
        const { data } = await supabase.from('client_accounts').select('*').eq('cafe_id', cafe?.id).ilike('name', `%${clientSearch}%`).limit(5)
        setClientResults(data || [])
      }
      searchClients()
    } else {
      setClientResults([])
    }
  }, [clientSearch, cafe])

  const handleAddExtras = async () => {
    const newItems = Object.entries(selectedExtras)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([pid, qty]) => {
        const p = products.find(prod => prod.id === pid)
        return { id: pid, name: p.name, price: p.price, qty }
      })

    const updatedExtras = [...(session.extras as any[]), ...newItems]
    const extrasTotal = updatedExtras.reduce((acc, e) => acc + ((e.price as number) * (e.qty as number)), 0)

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ extras: updatedExtras, extras_total: extrasTotal })
        .eq('id', session.id)

      if (error) throw error

      await supabase.from('audit_log').insert({
        cafe_id: cafe?.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        is_owner: type === 'owner',
        action: 'extras_added',
        details: { items: newItems, total: extrasTotal }
      })

      setShowExtras(false)
      setSelectedExtras({})
      addToast("Consommations ajoutées", "success")
      loadSession()
    } catch (err: any) {
      addToast(err.message, "error")
    }
  }

  const handleEndSession = async () => {
    if (!paymentMethod) return
    setIsEnding(true)

    const now = new Date().toISOString()
    const duration = Math.max(1, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000))
    const rate = Number(session.rate_per_hour) || 0
    let billableMinutesFinal = duration; const inc = cafe?.billing_increment || "minute"; if (inc === "15min") billableMinutesFinal = Math.ceil(duration / 15) * 15; else if (inc === "30min") billableMinutesFinal = Math.ceil(duration / 30) * 30; else if (inc === "hour") billableMinutesFinal = Math.ceil(duration / 60) * 60; const finalTimeCost = (billableMinutesFinal / 60) * rate
    const extrasT = Number(session.extras_total) || 0
    const total = Number(finalTimeCost) + Number(extrasT)

    try {
      const updates: any = {
        status: 'completed',
        ended_at: now,
        duration_minutes: duration,
        time_cost: finalTimeCost,
        payment_method: paymentMethod,
        total_amount: total,
        amount_received: paymentMethod === 'cash' ?  (parseFloat(receivedAmount) || 0)  : null,
        change_given: paymentMethod === 'cash' ? ( (parseFloat(receivedAmount) || 0)  || 0) - total : null,
        client_account_id: selectedClient?.id || session.client_account_id
      }

      const { error } = await supabase.from('sessions').update(updates).eq('id', session.id)
      if (error) throw error

      if (paymentMethod === 'account' && (selectedClient || session.client_account_id)) {
        const clientId = selectedClient?.id || session.client_account_id
        const { data: currentClient } = await supabase.from('client_accounts').select('*').eq('id', clientId).single()

        if (currentClient) {
          const newBalance = Number(currentClient.balance) - total
          await supabase.from('client_accounts').update({
            balance: newBalance,
            total_visits: Number(currentClient.total_visits) + 1,
            total_spent: Number(currentClient.total_spent) + total
          }).eq('id', clientId)

          await supabase.from('balance_transactions').insert({
            cafe_id: cafe?.id,
            client_id: clientId,
            session_id: session.id,
            staff_id: type === 'owner' ? owner?.id : staff?.id,
            type: 'debit',
            amount: total,
            balance_before: currentClient.balance,
            balance_after: newBalance,
            description: `Session Place ${session.seat_number}`
          })
        }
      } else if (selectedClient || session.client_account_id) {
        const clientId = selectedClient?.id || session.client_account_id
        const { data: c } = await supabase.from('client_accounts').select('total_visits, total_spent').eq('id', clientId).single()
        if (c) {
          await supabase.from('client_accounts').update({
            total_visits: Number(c.total_visits) + 1,
            total_spent: Number(c.total_spent) + total
          }).eq('id', clientId)
        }
      }

      await supabase.from('audit_log').insert({
        cafe_id: cafe?.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        is_owner: type === 'owner',
        action: 'session_closed',
        details: { payment_method: paymentMethod, total_amount: total, duration_minutes: duration }
      })

      addToast("Session clôturée", "success")
      navigate('/dashboard')
    } catch (err: any) {
      addToast(err.message, "error")
    } finally {
      setIsEnding(false)
    }
  }

  if (isLoading || !session) return null

  const currentExtrasTotal = Number(session.extras_total) || 0
  const totalAmount = session.status === 'active' ? (timeCost + currentExtrasTotal) : Number(session.total_amount)

  return (
    <div className="min-h-screen bg-bg relative pb-32">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-text">Place {session.seat_number}</span>
        <div className="flex items-center">
          <button className="p-2 -mr-2 text-text2 hover:text-text">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-2xl border flex flex-col items-center ${
            session.status === 'active'
              ? (isLong ? 'border-[rgba(245,158,11,0.4)] bg-linear-to-b from-[rgba(245,158,11,0.08)] to-transparent' : 'border-accent-border bg-linear-to-b from-[rgba(249,115,22,0.08)] to-transparent')
              : 'border-border bg-bg2'
          }`}
        >
          <span className="text-[15px] font-medium text-text2 mb-4">{session.customer_name}</span>
          {session.status === 'active' ? (
            <motion.div 
              animate={{ scale: [1, 1.006, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-[52px] font-mono font-extrabold text-text leading-none mb-6"
            >
              {elapsed}
            </motion.div>
          ) : (
            <div className="text-[42px] font-mono font-extrabold text-text3 leading-none mb-6">
              {Math.floor(Number(session.duration_minutes || 0) / 60).toString().padStart(2, '0')}:{(Number(session.duration_minutes || 0) % 60).toString().padStart(2, '0')}:00
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[12px] text-text2">
              <Clock size={13} className="text-text3" />
              <span>{session.status === 'active' ? {t('session.started_at')} : {t('session.ended_at')}} {format(new Date(session.status === 'active' ? session.started_at : (session.ended_at || session.started_at)), 'HH:mm')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-text2">
              <Gauge size={13} className="text-text3" />
              <span>{Number(session.rate_per_hour)?.toFixed(2)} DH/h</span>
            </div>
          </div>
        </motion.div>

        <section className="card space-y-0 divide-y divide-border">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2 text-[13px] text-text2">
              <Clock size={14} className="text-text3" />
              <span>{t('session.time_cost')}</span>
            </div>
            <span className="text-[13px] font-mono font-semibold text-accent2">{(session.status === 'active' ? timeCost : Number(session.time_cost || 0)).toFixed(2)} DH</span>
          </div>

          {(session.extras as any[]).map((extra, i) => (
            <div key={i} className="flex items-center justify-between h-12">
              <div className="flex items-center gap-2 text-[13px] text-text">
                <ShoppingBag size={14} className="text-text3" />
                <span className="truncate max-w-[180px]">{extra.qty}× {extra.name}</span>
              </div>
              <span className="text-[13px] font-mono font-semibold text-text">{(extra.price * extra.qty).toFixed(2)} DH</span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 pb-1">
            <span className="text-[14px] font-bold text-text">{t('session.total')}</span>
            <span className="text-[18px] font-mono font-extrabold text-accent2">
              {totalAmount.toFixed(2)} DH
            </span>
          </div>
        </section>

        {session.status === 'active' && (
          <button
            onClick={() => setShowExtras(true)}
            className="w-full h-[46px] border border-dashed border-border rounded-[10px] flex items-center justify-center gap-2 text-text2 hover:text-text transition-colors"
          >
            <Plus size={16} />
            <span className="text-[13px] font-semibold">{t('session.add_extra')}</span>
          </button>
        )}
      </main>

      {session.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg/80 to-transparent pt-8 z-50">
          <button
            onClick={() => setShowEnd(true)}
            className="btn-danger w-full h-[52px] bg-linear-to-br from-[#ef4444] to-[#dc2626] text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)] border-none"
          >
            <StopCircle size={18} />
            {t('session.end')}
          </button>
        </div>
      )}

      <BottomSheet isOpen={showExtras} onClose={() => setShowExtras(false)} title="Consommations">
        <div className="space-y-6 pt-2">
          {['boisson', 'nourriture', 'autre'].map(cat => {
            const catProducts = products.filter(p => p.category === cat)
            if (catProducts.length === 0) return null
            return (
              <div key={cat} className="space-y-3">
                <h4 className="text-[11px] font-bold text-text3 uppercase tracking-[0.1em]">{t(`cat.${cat}`)}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {catProducts.map(p => (
                    <div 
                      key={p.id} 
                      className={`p-3 rounded-[10px] border transition-all ${
                        selectedExtras[p.id] ? 'bg-accent-glow border-accent-border' : 'bg-surface2 border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[13px] font-semibold text-text truncate pr-2">{p.name}</span>
                        <span className="text-[12px] font-mono text-accent2 shrink-0">{p.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <button 
                          onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))}
                          className={`w-[28px] h-[28px] rounded-full flex items-center justify-center border transition-all ${
                            selectedExtras[p.id] ? 'bg-surface border-border text-text' : 'border-border/50 text-text3 opacity-30'
                          }`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-[14px] font-mono font-bold">{selectedExtras[p.id] || 0}</span>
                        <button 
                          onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}
                          className="w-[28px] h-[28px] rounded-full flex items-center justify-center bg-surface border border-border text-text"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="sticky bottom-0 bg-surface border-t border-border mt-8 -mx-4 px-4 py-4 flex items-center justify-between">
          <div className="text-[13px] font-medium text-text2">
            {Object.values(selectedExtras).reduce((a, b) => (a as number) + (b as number), 0)} article(s)
          </div>
          <Button 
            className="h-10 px-6 text-sm"
            onClick={handleAddExtras}
            disabled={Object.values(selectedExtras).every(v => v === 0)}
          >
            Ajouter
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={showEnd} onClose={() => setShowEnd(false)} title="Clôturer la session">
        <div className="space-y-6 pt-2">
          <div className="bg-surface2 p-4 rounded-xl border border-border space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-[12px] text-text2">
                <Users size={12} className="text-text3" /> {session.customer_name}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-text2">
                <Armchair size={12} className="text-text3" /> Place {session.seat_number}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-text2">
                <Clock size={12} className="text-text3" /> {elapsed.split(':').slice(0, 2).join('h ')}min
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-[14px] font-bold">Total à payer</span>
                <span className="text-[22px] font-mono font-extrabold text-accent2">{totalAmount.toFixed(2)} DH</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-text3 uppercase tracking-widest">{t('session.payment')}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cash', icon: Banknote, label: t('sessions.cash') },
                { id: 'card', icon: CreditCard, label: t('sessions.card') },
                { id: 'account', icon: Wallet, label: t('sessions.account') },
                { id: 'free', icon: Gift, label: t('sessions.free') },
              ].map(method => (
                <motion.button
                  key={method.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`h-[72px] flex flex-col items-center justify-center gap-1.5 rounded-[10px] border transition-all ${
                    paymentMethod === method.id
                      ? 'bg-accent-glow border-accent-border text-accent2 shadow-[0_0_12px_rgba(249,115,22,0.1)]'
                      : 'bg-surface border-border text-text2'
                  }`}
                >
                  <method.icon size={20} />
                  <span className="text-[13px] font-bold">{method.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {paymentMethod === 'cash' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Montant reçu"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="font-mono text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 font-mono">DH</span>
                </div>
                {receivedAmount && (
                  <div className={`text-[13px] font-bold ${ (parseFloat(receivedAmount) || 0)  >= totalAmount ? 'text-success' : 'text-error'}`}>
                    → {t('session.change')}: {(( (parseFloat(receivedAmount) || 0)  || 0) - totalAmount).toFixed(2)} DH
                  </div>
                )}
              </motion.div>
            )}

            {paymentMethod === 'account' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                {!selectedClient && !session.client_account_id ? (
                  <div className="relative">
                    <Input
                      placeholder="Chercher un compte client..."
                      icon={<Search size={16} />}
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                    <AnimatePresence>
                      {clientResults.length > 0 && (
                        <motion.div className="absolute top-full left-0 right-0 mt-1 bg-surface2 border border-border rounded-xl shadow-2xl z-20 py-1">
                          {clientResults.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedClient(c)}
                              className="w-full px-4 py-3 text-left hover:bg-white/5 flex justify-between items-center"
                            >
                              <span className="text-sm font-medium">{c.name}</span>
                              <span className="text-xs font-mono text-text3">{Number(c.balance).toFixed(2)} DH</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-surface border border-border p-3 rounded-lg">
                      <div>
                        <div className="text-sm font-bold">{selectedClient?.name || linkedClient?.name || t('session.account')}</div>
                        {(selectedClient || linkedClient) && <div className="text-xs text-text3">{t('clients.balance')}: {Number(selectedClient?.balance || linkedClient?.balance).toFixed(2)} DH</div>}
                      </div>
                      {!session.client_account_id && <button onClick={() => setSelectedClient(null)} className="text-text3 hover:text-error p-1"><X size={16} /></button>}
                    </div>
                    { (selectedClient || linkedClient) && Number(selectedClient?.balance || linkedClient?.balance) < totalAmount && (
                      <div className="p-3 bg-error-dim border border-[rgba(239,68,68,0.2)] rounded-lg flex items-center gap-3 text-error">
                        <AlertTriangle size={16} />
                        <span className="text-[12px] font-bold">t('session.insufficient_balance')</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border mt-8 -mx-4 px-4 py-4">
          <Button
            variant="success"
            className="w-full h-[52px]"
            disabled={!paymentMethod || (paymentMethod === 'cash' && (!receivedAmount ||  (parseFloat(receivedAmount) || 0)  < totalAmount)) || (paymentMethod === 'account' && !selectedClient && !session.client_account_id)}
            onClick={handleEndSession}
            isLoading={isEnding}
          >
            <CheckCircle size={18} />
            {t('common.confirm')} {totalAmount.toFixed(2)} DH
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="" message=""
      />
    </div>
  )
}
