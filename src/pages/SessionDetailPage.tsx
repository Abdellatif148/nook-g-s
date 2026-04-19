import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft,
  MoreVertical,
  Clock,
  Gauge,
  ShoppingBag,
  Plus,
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
  Users,
  Armchair,
  Coffee,
  Download,
  Share2,
  Printer
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { Button } from '../shared/components/ui/Button'
import { BottomSheet } from '../shared/components/ui/BottomSheet'
import { Input } from '../shared/components/ui/Input'
import { format } from 'date-fns'
import { calculateDurationMinutes, calculateBilledAmount, formatDuration } from '../shared/utils/billing'
import { smartWrite } from '../lib/offline/writeHelper'
import { useConnectivity } from '../shared/hooks/useConnectivity'

export default function SessionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isOnline } = useConnectivity()
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
  const [showReceiptOptions, setShowReceiptOptions] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})

  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [receivedAmount, setReceivedAmount] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [linkedClient, setLinkedClient] = useState<any>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])

  const loadSession = async () => {
    const active = activeSessions.find(s => s.id === id)
    if (active) {
      setSession(active)
      if (active.client_account_id) fetchLinkedClient(active.client_account_id)
    } else {
      const { data } = await supabase.from('sessions').select('*').eq('id', id).single()
      if (data) {
          setSession(data)
          if (data.client_account_id) fetchLinkedClient(data.client_account_id)
      }
    }
    setIsLoading(false)
  }

  const fetchLinkedClient = async (clientId: string) => {
    if (!isOnline) return
    const { data } = await supabase.from("client_accounts").select("*").eq("id", clientId).single()
    if (data) setLinkedClient(data)
  }

  useEffect(() => {
    loadSession()
  }, [id, activeSessions])

  useEffect(() => {
    if (session?.status !== 'active') return

    const update = () => {
      const duration = calculateDurationMinutes(session.started_at, new Date().toISOString())
      setElapsed(formatDuration(duration * 60))
      
      if (session.billing_mode === 'time') {
        const cost = calculateBilledAmount(duration, {
          ratePerHour: session.rate_per_hour,
          increment: cafe?.billing_increment || 'minute'
        })
        setTimeCost(cost)
      } else {
        setTimeCost(0)
      }

      const alertLimit = Number(cafe?.long_session_alert_hours) || 3
      if (duration / 60 >= alertLimit) setIsLong(true)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
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
      const { error } = await smartWrite('add_consumption', 'sessions', {
        id: session.id,
        extras: updatedExtras,
        extras_total: extrasTotal
      }, isOnline)

      if (error) throw error

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
    const duration = calculateDurationMinutes(session.started_at, now)
    const finalTimeCost = session.billing_mode === 'time'
      ? calculateBilledAmount(duration, { ratePerHour: session.rate_per_hour, increment: cafe?.billing_increment || 'minute' })
      : 0
    const extrasT = Number(session.extras_total) || 0
    const total = Number(finalTimeCost) + Number(extrasT)

    try {
      const payload: any = {
        id: session.id,
        status: 'completed',
        ended_at: now,
        duration_minutes: duration,
        time_cost: finalTimeCost,
        payment_method: paymentMethod,
        total_amount: total,
        amount_received: paymentMethod === 'cash' ? (parseFloat(receivedAmount) || 0) : null,
        change_given: paymentMethod === 'cash' ? ((parseFloat(receivedAmount) || 0) - total) : null,
        client_account_id: selectedClient?.id || session.client_account_id
      }

      const { error } = await smartWrite('close_session', 'sessions', payload, isOnline)
      if (error) throw error

      // Account flow (simplified for offline)
      if (isOnline && paymentMethod === 'account' && (selectedClient || session.client_account_id)) {
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
                  description: `Session Place ${session.seat_number}`,
                  billing_mode: session.billing_mode,
                  breakdown: { time_cost: finalTimeCost, extras: session.extras }
              })
          }
      }

      addToast("Session clôturée", "success")
      setShowEnd(false)
      setShowReceiptOptions(true)
    } catch (err: any) {
      addToast(err.message, "error")
    } finally {
      setIsEnding(false)
    }
  }

  const handleShareWhatsApp = () => {
    const phone = session.customer_phone || linkedClient?.phone || selectedClient?.phone
    if (!phone) {
        addToast("Numéro non disponible", "error")
        return
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const items = session.extras.map((e: any) => `- ${e.qty}x ${e.name} (${(e.price * e.qty).toFixed(2)} DH)`).join('\n')
    const timeInfo = session.billing_mode === 'time' ? `\nDurée: ${elapsed}\nTarif: ${session.rate_per_hour.toFixed(2)} DH/h` : ''

    const message = `*Reçu ${cafe?.name || 'Nook Cafe'}*\n\nClient: ${session.customer_name}\nDate: ${format(new Date(), 'dd/MM/yyyy')}${timeInfo}\n\nCommandes:\n${items}\n\n*TOTAL: ${session.total_amount.toFixed(2)} DH*\n\nMerci pour votre visite !`

    window.open(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank')
  }

  if (isLoading || !session) return null

  const currentExtrasTotal = Number(session.extras_total) || 0
  const totalAmount = session.status === 'active' ? (timeCost + currentExtrasTotal) : Number(session.total_amount)

  return (
    <div className="min-h-screen bg-bg relative pb-32">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-text">Place {session.seat_number}</span>
        <div className="flex items-center">
            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold mr-2 ${
                session.billing_mode === 'time' ? 'bg-accent/10 text-accent' : 'bg-amber-500/10 text-amber-500'
            }`}>
                {session.billing_mode === 'time' ? 'TEMPS' : 'CONSO'}
            </div>
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
              ? (isLong ? 'border-warning/40 bg-warning-dim/20' : 'border-accent-border bg-accent-glow/20')
              : 'border-border bg-bg2'
          }`}
        >
          <span className="text-[15px] font-medium text-text2 mb-4">{session.customer_name}</span>
          <div className="text-[52px] font-mono font-extrabold text-text leading-none mb-6">
            {session.status === 'active' ? elapsed : formatDuration((session.duration_minutes || 0) * 60)}
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[12px] text-text2">
              <Clock size={13} className="text-text3" />
              <span>{session.status === 'active' ? 'Début' : 'Fin'} {format(new Date(session.status === 'active' ? session.started_at : (session.ended_at || session.started_at)), 'HH:mm')}</span>
            </div>
            {session.billing_mode === 'time' && (
              <div className="flex items-center gap-1.5 text-[12px] text-text2">
                <Gauge size={13} className="text-text3" />
                <span>{Number(session.rate_per_hour)?.toFixed(2)} DH/h</span>
              </div>
            )}
          </div>
        </motion.div>

        <section className="card space-y-0 divide-y divide-border">
          {session.billing_mode === 'time' && (
            <div className="flex items-center justify-between h-12">
              <div className="flex items-center gap-2 text-[13px] text-text2">
                <Clock size={14} className="text-text3" />
                <span>Temps (Facturé)</span>
              </div>
              <span className="text-[13px] font-mono font-semibold text-accent2">{(session.status === 'active' ? timeCost : Number(session.time_cost || 0)).toFixed(2)} DH</span>
            </div>
          )}

          {session.billing_mode === 'consumption' && (
             <div className="flex items-center justify-between h-12">
               <div className="flex items-center gap-2 text-[13px] text-text3">
                 <Clock size={14} />
                 <span>Temps (Non facturé)</span>
               </div>
               <span className="text-[13px] font-mono font-medium text-text3">{elapsed}</span>
             </div>
          )}

          {(session.extras as any[]).map((extra, i) => (
            <div key={i} className="flex items-center justify-between h-12">
              <div className="flex items-center gap-2 text-[13px] text-text">
                <Coffee size={14} className="text-text3" />
                <span className="truncate max-w-[180px]">{extra.qty}× {extra.name}</span>
              </div>
              <span className={`text-[13px] font-mono font-semibold ${session.billing_mode === 'consumption' ? 'text-accent2' : 'text-text3'}`}>
                  {(extra.price * extra.qty).toFixed(2)} DH
                  {session.billing_mode === 'time' && ' (Suivi)'}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 pb-1">
            <span className="text-[14px] font-bold text-text">Total à payer</span>
            <span className="text-[22px] font-mono font-extrabold text-accent2">
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
            <span className="text-[13px] font-semibold">Ajouter une commande</span>
          </button>
        )}
      </main>

      {session.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg/80 to-transparent pt-8 z-50">
          <button
            onClick={() => setShowEnd(true)}
            className="btn-danger w-full h-[52px] bg-red-500 text-white font-bold rounded-xl"
          >
            <StopCircle size={18} className="mr-2" />
            Terminer la session
          </button>
        </div>
      )}

      <BottomSheet isOpen={showExtras} onClose={() => setShowExtras(false)} title="Consommations">
          <div className="space-y-6 pt-2">
            {/* Simple product list for now */}
            <div className="grid grid-cols-2 gap-2">
              {products.map(p => (
                <div key={p.id} className="p-3 bg-surface2 border border-border rounded-xl">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-xs text-text3 mb-3">{p.price.toFixed(2)} DH</div>
                    <div className="flex items-center justify-between">
                        <button onClick={() => setSelectedExtras(prev => ({...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1)}))} className="p-1 border border-border rounded"><Minus size={14}/></button>
                        <span className="font-mono font-bold">{selectedExtras[p.id] || 0}</span>
                        <button onClick={() => setSelectedExtras(prev => ({...prev, [p.id]: (prev[p.id] || 0) + 1}))} className="p-1 border border-border rounded"><Plus size={14}/></button>
                    </div>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={handleAddExtras} disabled={Object.values(selectedExtras).every(v => v === 0)}>Ajouter</Button>
          </div>
      </BottomSheet>

      <BottomSheet isOpen={showEnd} onClose={() => setShowEnd(false)} title="Clôturer la session">
        <div className="space-y-6">
            <div className="bg-surface2 p-4 rounded-xl border border-border">
                <div className="text-sm text-text3 mb-1">Total à régler</div>
                <div className="text-3xl font-mono font-bold text-accent2">{totalAmount.toFixed(2)} DH</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {['cash', 'card', 'account', 'free'].map(m => (
                    <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`p-4 rounded-xl border text-center ${paymentMethod === m ? 'border-accent bg-accent/5' : 'border-border'}`}
                    >
                        <div className="text-sm font-bold uppercase">{m}</div>
                    </button>
                ))}
            </div>
            <Button variant="success" className="w-full" onClick={handleEndSession} disabled={!paymentMethod} isLoading={isEnding}>Confirmer le paiement</Button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={showReceiptOptions} onClose={() => { setShowReceiptOptions(false); navigate('/dashboard'); }} title="Session terminée">
        <div className="space-y-3 pb-4">
            <div className="p-5 bg-success/10 border border-success/20 rounded-2xl flex flex-col items-center text-center mb-4">
                <CheckCircle size={48} className="text-success mb-3" />
                <h3 className="text-lg font-bold text-text">Paiement Reçu</h3>
                <p className="text-sm text-text3">La session a été clôturée avec succès.</p>
            </div>

            <Button variant="outline" className="w-full h-12 justify-start gap-3" onClick={() => window.print()}>
                <Printer size={18} /> Imprimer le reçu
            </Button>
            <Button variant="outline" className="w-full h-12 justify-start gap-3" onClick={handleShareWhatsApp}>
                <Share2 size={18} /> Envoyer via WhatsApp
            </Button>
            <Button variant="outline" className="w-full h-12 justify-start gap-3" onClick={() => navigate('/dashboard')}>
                <Download size={18} /> Télécharger PDF
            </Button>
            <Button className="w-full h-12 mt-4" onClick={() => navigate('/dashboard')}>
                Passer
            </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
