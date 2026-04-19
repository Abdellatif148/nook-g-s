import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  UserCircle,
  Phone,
  Armchair,
  Clock,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  Play,
  Eye,
  Coffee,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { Button } from '../shared/components/ui/Button'
import { Input } from '../shared/components/ui/Input'
import { format } from 'date-fns'
import { smartWrite } from '../lib/offline/writeHelper'
import { useConnectivity } from '../shared/hooks/useConnectivity'

type Step = 'mode' | 'details' | 'confirm'

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isOnline } = useConnectivity()
  const { cafe, type, owner, staff } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const { addToast } = useUIStore()

  const [step, setStep] = useState<Step>('mode')
  const [isLoading, setIsLoading] = useState(false)

  // Data
  const [billingMode, setBillingMode] = useState<'time' | 'consumption' | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [recentCustomers, setRecentCustomers] = useState<string[]>([])

  useEffect(() => {
    const loadRecents = async () => {
      if (!cafe || !isOnline) return
      const { data } = await supabase
        .from('sessions')
        .select('customer_name')
        .eq('cafe_id', cafe.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) {
        const unique = Array.from(new Set(data.map(s => s.customer_name))).slice(0, 6)
        setRecentCustomers(unique)
      }
    }
    loadRecents()
  }, [cafe, isOnline])

  const occupiedSeats = activeSessions.map(s => s.seat_number)

  const handleStartSession = async () => {
    if (!customerName || !selectedSeat || !cafe || !billingMode) return
    
    setIsLoading(true)
    try {
      const rate = rateType === 'standard' ? cafe.default_rate : 
                   rateType === 'premium' ? cafe.premium_rate : customRate

      const payload = {
        cafe_id: cafe.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        seat_number: selectedSeat,
        rate_per_hour: billingMode === 'time' ? rate : 0,
        billing_mode: billingMode,
        rate: billingMode === 'time' ? rate : null,
        rate_unit: billingMode === 'time' ? 60 : null,
        started_at: new Date().toISOString(),
        status: 'active',
        notes: notes.trim(),
        extras: [],
        extras_total: 0,
        total_amount: 0
      }

      const { error } = await smartWrite('open_session', 'sessions', payload, isOnline)

      if (error) throw error

      if (isOnline) {
        await supabase.from('audit_log').insert({
          cafe_id: cafe.id,
          staff_id: type === 'owner' ? owner?.id : staff?.id,
          is_owner: type === 'owner',
          action: 'session_started',
          details: { customer_name: customerName, seat_number: selectedSeat, billing_mode: billingMode }
        })
      }

      addToast(`Session démarrée — Place ${selectedSeat}`, 'success')
      navigate('/dashboard')
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg relative pb-32">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => step === 'mode' ? navigate(-1) : setStep(step === 'confirm' ? 'details' : 'mode')} className="p-2 -ml-2 text-text2 hover:text-text">
          <X size={22} />
        </button>
        <span className="text-base font-bold text-text">{t('sessions.new')}</span>
        <div className="w-10" />
      </header>

      <main className="pt-20 px-4 space-y-8 relative z-10">
        <AnimatePresence mode="wait">
          {step === 'mode' && (
            <motion.div
              key="step-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-text">Mode de facturation</h2>
                <p className="text-sm text-text3">Choisissez comment cette session sera facturée.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => { setBillingMode('time'); setStep('details'); }}
                  className="p-5 rounded-2xl border-2 border-border bg-surface2 hover:border-accent group transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-glow flex items-center justify-center text-accent">
                      <Clock size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-text group-hover:text-accent">TEMPS</div>
                      <p className="text-[13px] text-text3">Le client paie selon la durée. Les commandes sont suivies mais non facturées.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { setBillingMode('consumption'); setStep('details'); }}
                  className="p-5 rounded-2xl border-2 border-border bg-surface2 hover:border-amber-500 group transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Coffee size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-text group-hover:text-amber-500">CONSOMMATION</div>
                      <p className="text-[13px] text-text3">Le client paie uniquement ses commandes. Le temps est affiché mais jamais facturé.</p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="step-details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-7"
            >
              <section className="space-y-3">
                <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.1em]">Client</label>
                <div className="space-y-3">
                  <Input
                    autoFocus
                    placeholder="Nom du client"
                    icon={<UserCircle size={16} />}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    type="tel"
                    placeholder="Téléphone"
                    icon={<Phone size={16} />}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <label className="text-[11px] font-bold text-text3 uppercase tracking-widest">Place</label>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: cafe?.total_seats || 20 }).map((_, i) => {
                    const seatNum = i + 1
                    const isOccupied = occupiedSeats.includes(seatNum)
                    const isSelected = selectedSeat === seatNum
                    return (
                      <button
                        key={seatNum}
                        disabled={isOccupied}
                        onClick={() => setSelectedSeat(seatNum)}
                        className={`h-12 rounded-lg border flex items-center justify-center font-mono font-bold ${
                          isOccupied ? 'bg-surface/50 border-border opacity-40' :
                          isSelected ? 'bg-accent border-accent text-white' : 'bg-surface2 border-border'
                        }`}
                      >
                        {seatNum}
                      </button>
                    )
                  })}
                </div>
              </section>

              {billingMode === 'time' && (
                <section className="space-y-3">
                  <label className="text-[11px] font-bold text-text3 uppercase tracking-widest">Tarif</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRateType('standard')}
                      className={`p-3 rounded-lg border text-left ${rateType === 'standard' ? 'bg-accent-glow border-accent' : 'bg-surface2 border-border'}`}
                    >
                      <div className="text-xs font-bold">Standard</div>
                      <div className="text-lg font-mono font-bold">{cafe?.default_rate.toFixed(2)}</div>
                    </button>
                    <button
                      onClick={() => setRateType('premium')}
                      className={`p-3 rounded-lg border text-left ${rateType === 'premium' ? 'bg-accent-glow border-accent' : 'bg-surface2 border-border'}`}
                    >
                      <div className="text-xs font-bold">Premium</div>
                      <div className="text-lg font-mono font-bold">{cafe?.premium_rate.toFixed(2)}</div>
                    </button>
                  </div>
                </section>
              )}

              <Button
                className="w-full h-[52px]"
                disabled={!customerName || !selectedSeat}
                onClick={() => setStep('confirm')}
              >
                Suivant <ArrowRight size={18} className="ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="step-confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-surface2 border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-text3">Client</div>
                  <div className="text-base font-bold text-text">{customerName}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-text3">Place</div>
                  <div className="text-base font-bold text-accent">{selectedSeat}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-text3">Mode</div>
                  <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                    billingMode === 'time' ? 'bg-accent/10 text-accent' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {billingMode === 'time' ? 'TEMPS' : 'CONSOMMATION'}
                  </div>
                </div>
                {billingMode === 'time' && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-text3">Tarif</div>
                    <div className="text-base font-mono font-bold">
                      {(rateType === 'standard' ? cafe?.default_rate : rateType === 'premium' ? cafe?.premium_rate : customRate)?.toFixed(2)} DH/h
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex gap-3 items-start">
                <CheckCircle2 size={18} className="text-accent shrink-0 mt-0.5" />
                <p className="text-[13px] text-text2 leading-relaxed">
                  Cette sélection est définitive pour cette session. Le mode de facturation ne pourra plus être modifié.
                </p>
              </div>

              <Button
                className="w-full h-[52px]"
                onClick={handleStartSession}
                isLoading={isLoading}
              >
                <Play size={18} className="mr-2" />
                Démarrer la session
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
