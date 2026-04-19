import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft, MoreVertical, Clock, AlertCircle,
  ShoppingBag, Plus, StopCircle, Trash2, CheckCircle,
  Banknote, CreditCard, Wallet, Gift, Loader2, Phone,
  FileText, Share2, Printer, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from '../../i18n'
import { useAudit } from '../../shared/hooks/useAudit'
import { Button } from '../../components/ui/Button'
import { Session, Product } from '../../types'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { smartWrite } from '../../lib/offline/writeHelper'
import { calculateBilling, formatDuration } from '../../shared/utils/billing'

export default function SessionDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [timeCost, setTimeCost] = useState(0)
  const [isLong, setIsLong] = useState(false)

  const [showExtras, setShowExtras] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showReceiptOptions, setShowReceiptOptions] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})
  const [itemToRemove, setItemToRemove] = useState<number | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        addToast("Session non trouvée", "error")
        navigate('/dashboard')
        return
      }
      setSession(data)
      setIsLoading(false)
    }

    const loadProducts = async () => {
      if (!cafe) return
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('active', true)
        .order('sort_order')
      if (data) setProducts(data)
    }

    loadSession()
    loadProducts()
  }, [id, cafe])

  useEffect(() => {
    if (!session) return
    const update = () => {
      const start = new Date(session.started_at).getTime()
      if (isNaN(start)) return

      const end = (session.status === 'completed' || session.status === 'cancelled') && session.ended_at
        ? new Date(session.ended_at).getTime()
        : Date.now()

      const diffMs = end - start
      const diffSec = Math.floor(diffMs / 1000)

      setElapsed(formatDuration(diffSec))

      if (session.status === 'completed' || session.status === 'cancelled') {
        setTimeCost(session.time_cost || 0)
      } else if (session.billing_mode === 'time') {
        const rate = session.rate || session.rate_per_hour || 0
        const rateUnit = session.rate_unit || 60
        const billing = calculateBilling(session.started_at, null, rate, rateUnit)
        setTimeCost(billing.amount)
      } else {
        setTimeCost(0)
      }

      const alertHours = cafe?.long_session_alert_hours || 3
      if (diffSec >= alertHours * 3600) setIsLong(true)
    }

    update()
    if (session.status === 'active') {
      const interval = setInterval(update, 1000)
      return () => clearInterval(interval)
    }
  }, [session, cafe?.long_session_alert_hours])

  const handleAddExtras = async () => {
    if (!session) return
    const newExtras = [...(session.extras as any[])]
    let newExtrasTotal = session.extras_total

    Object.entries(selectedExtras).forEach(([prodId, qty]: [string, any]) => {
      if (qty <= 0) return
      const product = products.find(p => p.id === prodId)
      if (product) {
        newExtras.push({ id: prodId, name: product.name, price: product.price, qty })
        newExtrasTotal += product.price * qty
      }
    })

    try {
      const updatedData = {
        ...session,
        extras: newExtras,
        extras_total: newExtrasTotal,
        total_amount: (session.billing_mode === 'time' ? timeCost : 0) + newExtrasTotal
      }

      const data = await smartWrite('sessions', 'update_session', {
        id: session.id,
        extras: newExtras,
        extras_total: newExtrasTotal,
        total_amount: updatedData.total_amount
      }, updatedData);

      await logAction('extras_added', { session_id: session.id, count: newExtras.length });

      setSession(data)
      setShowExtras(false)
      setSelectedExtras({})
      addToast("Consommations ajoutées", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    }
  }

  const handleRemoveExtra = async (index: number) => {
    if (!session) return
    const newExtras = [...(session.extras as any[])]
    const removed = newExtras.splice(index, 1)[0]
    const newExtrasTotal = session.extras_total - (removed.price * removed.qty)

    try {
      const updatedData = {
        ...session,
        extras: newExtras,
        extras_total: newExtrasTotal,
        total_amount: (session.billing_mode === 'time' ? timeCost : 0) + newExtrasTotal
      }

      const data = await smartWrite('sessions', 'update_session', {
        id: session.id,
        extras: newExtras,
        extras_total: newExtrasTotal,
        total_amount: updatedData.total_amount
      }, updatedData);

      setSession(data)
      addToast("Article supprimé", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    }
  }

  const handleEndSession = async (method: string) => {
    if (!session) return
    setIsLoading(true)
    try {
      const rate = session.rate || session.rate_per_hour || 0
      const rateUnit = session.rate_unit || 60
      const billing = calculateBilling(session.started_at, null, rate, rateUnit)

      const finalTimeCost = session.billing_mode === 'time' ? billing.amount : 0
      const totalAmount = finalTimeCost + session.extras_total

      const updatedSession = {
        ...session,
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_minutes: billing.durationMinutes,
        time_cost: finalTimeCost,
        total_amount: totalAmount,
        payment_method: method
      }

      await smartWrite('sessions', 'update_session', {
        id: session.id,
        status: 'completed',
        ended_at: updatedSession.ended_at,
        duration_minutes: updatedSession.duration_minutes,
        time_cost: updatedSession.time_cost,
        total_amount: updatedSession.total_amount,
        payment_method: method
      }, updatedSession);

      await logAction('session_closed', { session_id: session.id, amount: totalAmount, method })

      setSession(updatedSession as Session)
      setShowEnd(false)
      setShowReceiptOptions(true)
      addToast("Session clôturée", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSession = async () => {
    if (!session) return
    setIsLoading(true)
    try {
      const updatedSession = {
        ...session,
        status: 'cancelled',
        ended_at: new Date().toISOString()
      }

      await smartWrite('sessions', 'update_session', {
        id: session.id,
        status: 'cancelled',
        ended_at: updatedSession.ended_at
      }, updatedSession);

      await logAction('session_cancelled', { session_id: session.id })

      setSession(updatedSession as Session)
      setShowCancel(false)
      addToast("Session annulée", "info")
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareWhatsApp = () => {
    if (!session || !session.customer_phone) {
      addToast("Numéro non disponible", "error");
      return;
    }
    const phone = session.customer_phone.replace(/\D/g, '');
    const message = `Facture Nook OS - ${cafe?.name}
Client: ${session.customer_name}
Durée: ${elapsed}
Total: ${session.total_amount.toFixed(2)} DH
Merci pour votre visite!`;
    window.open(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  const currentTotal = (session.status === 'active' ? (session.billing_mode === 'time' ? timeCost : 0) + session.extras_total : session.total_amount)

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text transition-colors" aria-label="Retour">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter text-text leading-none">{session.customer_name}</h1>
            <p className="text-[10px] font-bold text-text3 uppercase tracking-widest mt-1">Place {session.seat_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {session.status === 'active' && (
            <button onClick={() => setShowCancel(true)} className="p-2 text-text3 hover:text-error transition-colors">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 px-4 space-y-8 max-w-lg mx-auto">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center py-6">
          <div className="text-[10px] font-black text-text3 uppercase tracking-[0.2em] mb-4">
            {session.status === 'active' ? 'Session en cours' : 'Session terminée'}
          </div>
          <div className="text-6xl font-mono font-black text-text tracking-tighter mb-2">{elapsed}</div>
          {session.status === 'completed' && (
             <div className="mt-6 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-widest">
                <CheckCircle size={12} /> Payé via {t(`sessions.${session.payment_method}`)}
             </div>
          )}
        </motion.div>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-text3 uppercase tracking-widest">Détails de la facture</h3>
            <div className="text-[9px] font-bold text-accent2 uppercase tracking-widest px-2 py-0.5 bg-accent/10 rounded-full">
              Mode {session.billing_mode === 'time' ? 'Temps' : 'Consommation'}
            </div>
          </div>

          <div className={`p-4 bg-surface border border-border rounded-2xl flex items-center justify-between ${session.billing_mode !== 'time' ? 'opacity-50' : ''}`}>
             <div className="flex items-center gap-3">
                <Clock size={20} className="text-accent" />
                <div>
                   <div className="text-sm font-bold text-text">Temps de session</div>
                   <div className="text-[10px] text-text3 font-medium">
                      {session.billing_mode === 'time' ? `Facturé au tarif ${(session.rate || session.rate_per_hour || 0).toFixed(2)} DH/h` : 'Non facturé'}
                   </div>
                </div>
             </div>
             <div className="text-sm font-mono font-bold text-accent2">{timeCost.toFixed(2)} DH</div>
          </div>

          {(session.extras as any[]).map((extra, i) => (
             <div key={i} className="p-4 bg-surface border border-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <ShoppingBag size={20} className="text-text3" />
                   <div>
                      <div className="text-sm font-bold text-text">{extra.name}</div>
                      <div className="text-[10px] text-text3">{extra.qty} × {extra.price.toFixed(2)} DH</div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-sm font-mono font-bold text-text">{(extra.price * extra.qty).toFixed(2)} DH</div>
                   {session.status === 'active' && <button onClick={() => setItemToRemove(i)} className="p-2 text-text3 hover:text-error"><Trash2 size={16} /></button>}
                </div>
             </div>
          ))}

          <div className="p-4 bg-surface border border-accent/20 rounded-2xl flex justify-between items-center shadow-lg shadow-accent/5">
            <div className="text-sm font-bold text-text">Total</div>
            <div className="text-2xl font-mono font-extrabold text-accent2">{currentTotal.toFixed(2)} DH</div>
          </div>
        </section>

        {session.status === 'active' && (
          <button onClick={() => setShowExtras(true)} className="w-full py-5 bg-surface2 border border-dashed border-border rounded-2xl flex items-center justify-center gap-3 text-text3 transition-all">
            <Plus size={18} /> <span className="text-sm font-bold uppercase tracking-widest">Ajouter une commande</span>
          </button>
        )}
      </main>

      {session.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg to-transparent pt-12">
          <Button onClick={() => setShowEnd(true)} className="w-full h-14 text-lg bg-linear-to-br from-error to-[#dc2626]">
            <StopCircle size={20} /> {t('sessions.end')}
          </Button>
        </div>
      )}

      {/* Extras Sheet */}
      <BottomSheet isOpen={showExtras} onClose={() => setShowExtras(false)} title="Consommations">
        <div className="space-y-6 pt-4">
          {products.map(p => (
            <div key={p.id} className="p-4 bg-surface2 border border-border rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-text">{p.name}</div>
                <div className="text-xs text-accent2 font-mono">{p.price.toFixed(2)} DH</div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border">-</button>
                <span className="text-sm font-bold font-mono">{selectedExtras[p.id] || 0}</span>
                <button onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border">+</button>
              </div>
            </div>
          ))}
          <Button className="w-full h-14" onClick={handleAddExtras}>Confirmer</Button>
        </div>
      </BottomSheet>

      {/* End Session Sheet */}
      <BottomSheet isOpen={showEnd} onClose={() => setShowEnd(false)} title="Règlement">
        <div className="space-y-8 pt-4">
          <div className="bg-surface2 p-4 rounded-xl border border-border flex justify-between items-center">
             <span className="text-sm font-bold text-text">Total à payer</span>
             <span className="text-2xl font-mono font-extrabold text-accent2">{currentTotal.toFixed(2)} DH</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['cash', 'card', 'account', 'free'].map(method => (
              <button key={method} onClick={() => handleEndSession(method)} className="h-20 flex flex-col items-center justify-center gap-2 bg-surface2 border border-border rounded-xl hover:border-accent">
                <span className="text-xs font-bold text-text uppercase">{t(`sessions.${method}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Receipt Options Sheet (Task 3D) */}
      <BottomSheet isOpen={showReceiptOptions} onClose={() => { setShowReceiptOptions(false); navigate('/dashboard'); }} title="Reçu & Facture">
         <div className="space-y-4 pt-4">
            <Button onClick={handleShareWhatsApp} variant="secondary" className="w-full h-14 gap-3">
               <Share2 size={20} /> Envoyer via WhatsApp
            </Button>
            <Button onClick={() => window.print()} variant="secondary" className="w-full h-14 gap-3">
               <Printer size={20} /> Imprimer le reçu
            </Button>
            <Button onClick={() => { setShowReceiptOptions(false); navigate('/dashboard'); }} className="w-full h-14">
               <X size={20} /> Passer
            </Button>
         </div>
      </BottomSheet>

      <ConfirmDialog isOpen={itemToRemove !== null} onClose={() => setItemToRemove(null)} onConfirm={() => { if (itemToRemove !== null) handleRemoveExtra(itemToRemove); setItemToRemove(null); }} title="Supprimer l'article ?" message="Voulez-vous retirer cet article ?" variant="danger" />
      <ConfirmDialog isOpen={showCancel} onClose={() => setShowCancel(false)} onConfirm={handleCancelSession} title="Annuler la session ?" message="Cette action est irréversible." variant="danger" />

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 5mm; color: black; background: white; font-family: monospace; }
        }
      `}} />

      <div id="receipt" className="hidden print:block">
          <div className="text-center font-bold mb-2 uppercase">{cafe?.name}</div>
          <div className="flex justify-between mb-1"><span>Client:</span> <span>{session.customer_name}</span></div>
          <div className="flex justify-between mb-1"><span>Date:</span> <span>{new Date().toLocaleDateString()}</span></div>
          <div className="flex justify-between mb-4"><span>Durée:</span> <span>{elapsed}</span></div>
          <div className="border-b border-black mb-2"></div>
          {session.billing_mode === 'time' && <div className="flex justify-between mb-1"><span>Temps:</span> <span>{timeCost.toFixed(2)} DH</span></div>}
          {(session.extras as any[]).map((e, i) => <div key={i} className="flex justify-between mb-1"><span>{e.name} x{e.qty}:</span> <span>{(e.price * e.qty).toFixed(2)} DH</span></div>)}
          <div className="border-b border-black my-2"></div>
          <div className="flex justify-between font-bold"><span>TOTAL:</span> <span>{session.total_amount.toFixed(2)} DH</span></div>
          <div className="text-center mt-6">Merci pour votre visite!</div>
      </div>
    </div>
  )
}
