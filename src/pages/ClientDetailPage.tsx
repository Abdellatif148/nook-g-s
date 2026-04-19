import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft, MoreVertical, Phone, MessageCircle, 
  PlusCircle, Repeat, TrendingUp, Calendar, Clock,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { Avatar } from '../shared/components/ui/Avatar'
import { Button } from '../shared/components/ui/Button'
import { BottomSheet } from '../shared/components/ui/BottomSheet'
import { Input } from '../shared/components/ui/Input'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { cafe, type, owner, staff } = useAuthStore()
  const { addToast } = useUIStore()

  const [client, setClient] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRecharge, setShowRecharge] = useState(false)

  // Recharge form
  const [rechargeAmount, setRechargeAmount] = useState<number>(0)
  const [rechargeRef, setRechargeRef] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    const { data: clientData } = await supabase.from('client_accounts').select('*').eq('id', id).single()
    if (clientData) {
      setClient(clientData)
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('client_account_id', id)
        .order('ended_at', { ascending: false })
        .limit(20)
      setSessions(sessionData || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleRecharge = async () => {
    if (!rechargeAmount || !client) return
    setIsSaving(true)
    try {
      const newBalance = client.balance + rechargeAmount
      
      const { error: updateError } = await supabase
        .from('client_accounts')
        .update({ balance: newBalance })
        .eq('id', client.id)
      
      if (updateError) throw updateError

      await supabase.from('balance_transactions').insert({
        cafe_id: cafe?.id,
        client_id: client.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        type: 'credit',
        amount: rechargeAmount,
        balance_before: client.balance,
        balance_after: newBalance,
        description: rechargeRef || 'Recharge manuelle'
      })

      await supabase.from('audit_log').insert({
        cafe_id: cafe?.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        is_owner: type === 'owner',
        action: 'client_recharged',
        details: { client_name: client.name, amount: rechargeAmount }
      })

      addToast("Compte rechargé", "success")
      setShowRecharge(false)
      setRechargeAmount(0)
      setRechargeRef('')
      loadData()
    } catch (err: any) {
      addToast(err.message, "error")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !client) return null

  return (
    <div className="min-h-screen bg-bg relative pb-12">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-text truncate px-4">{client.name}</span>
        <button className="p-2 -mr-2 text-text2">
          <MoreVertical size={20} />
        </button>
      </header>

      <main className="pt-20 px-4 space-y-6 relative z-10">
        {/* HEADER CARD */}
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center">
          <Avatar name={client.name} size={56} />
          <h2 className="text-xl font-extrabold text-text mt-3">{client.name}</h2>
          {client.phone && (
            <div className="flex items-center gap-1.5 text-text3 text-[13px] mt-1">
              <Phone size={13} />
              <span>{client.phone}</span>
            </div>
          )}

          <div className="mt-5 w-full">
            <div className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-1">{t('clients.balance')}</div>
            <div className={`text-[32px] font-mono font-extrabold ${
              client.balance > 50 ? 'text-success' : client.balance < 10 ? 'text-error' : 'text-warning'
            }`}>
              {client.balance.toFixed(2)} DH
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <Button variant="success" className="h-11 text-xs" onClick={() => setShowRecharge(true)}>
              <PlusCircle size={16} /> {t('clients.recharge')}
            </Button>
            {client.phone && (
              <a 
                href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=Bonjour ${client.name}, votre solde Nook OS est de ${client.balance.toFixed(2)} DH.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost h-11 text-xs flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full mt-6 pt-5 border-t border-border">
            <div className="flex flex-col items-center">
              <Repeat size={14} className="text-text3 mb-1" />
              <span className="text-[14px] font-bold text-text">{client.total_visits}</span>
              <span className="text-[10px] text-text3 uppercase">{t('clients.visits')}</span>
            </div>
            <div className="flex flex-col items-center">
              <TrendingUp size={14} className="text-text3 mb-1" />
              <span className="text-[14px] font-bold text-text">{client.total_spent.toFixed(0)}</span>
              <span className="text-[10px] text-text3 uppercase">{t('clients.spent')}</span>
            </div>
            <div className="flex flex-col items-center">
              <Calendar size={14} className="text-text3 mb-1" />
              <span className="text-[14px] font-bold text-text">{format(new Date(client.created_at), 'MM/yy')}</span>
              <span className="text-[10px] text-text3 uppercase">{t('clients.since') || 'Depuis'}</span>
            </div>
          </div>
        </div>

        {/* VISIT HISTORY */}
        <section className="space-y-4">
          <h3 className="text-[15px] font-bold text-text">{t('clients.history') || 'Historique des visites'}</h3>
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-[12px] font-mono text-text3">
                    {format(new Date(s.ended_at || s.started_at), 'dd/MM')}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-text">Place {s.seat_number}</div>
                    <div className="text-[11px] text-text3 mt-0.5">{s.duration_minutes}min · {s.total_amount.toFixed(2)} DH</div>
                  </div>
                </div>
                <div className="text-text3 opacity-60">
                   <Clock size={16} />
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="py-10 text-center text-text3 text-sm">Aucune visite</div>
            )}
          </div>
        </section>
      </main>

      <BottomSheet isOpen={showRecharge} onClose={() => setShowRecharge(false)} title={t('clients.recharge_title') || 'Recharger'}>
        <div className="space-y-6 pt-2">
          <div className="flex flex-col items-center py-4">
            <div className="text-[11px] font-bold text-text3 uppercase mb-1">Solde actuel</div>
            <div className={`text-[28px] font-mono font-bold ${client.balance > 0 ? 'text-success' : 'text-error'}`}>
              {client.balance.toFixed(2)} DH
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[20, 50, 100, 200].map(amt => (
              <motion.button
                key={amt}
                whileTap={{ scale: 0.95 }}
                onClick={() => setRechargeAmount(amt)}
                className={`h-10 rounded-lg border font-mono font-bold text-sm transition-all ${
                  rechargeAmount === amt ? 'bg-accent text-white border-accent' : 'bg-surface2 border-border text-text2'
                }`}
              >
                {amt}
              </motion.button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Montant (DH)"
                value={rechargeAmount || ''}
                onChange={e => setRechargeAmount(parseFloat(e.target.value) || 0)}
                className="font-mono text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 font-mono">DH</span>
            </div>
            <Input
              placeholder="Référence (optionnel)"
              value={rechargeRef}
              onChange={e => setRechargeRef(e.target.value)}
            />
          </div>

          <div className="p-3.5 bg-success-dim border border-[rgba(16,185,129,0.2)] rounded-lg flex justify-between items-center">
            <span className="text-[13px] font-medium text-success">Nouveau solde</span>
            <span className="text-[18px] font-mono font-bold text-success">
              {(client.balance + rechargeAmount).toFixed(2)} DH
            </span>
          </div>

          <Button 
            className="w-full h-[52px]"
            onClick={handleRecharge}
            isLoading={isSaving}
            disabled={!rechargeAmount}
          >
            {t('clients.confirm_recharge') || 'Confirmer la recharge'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
