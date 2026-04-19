/**
 * New session flow — 3 steps in mandatory order:
 *   STEP 1: Billing mode selection (permanent choice, shown first)
 *   STEP 2: Client details + seat + rate
 *   STEP 3: Confirmation summary → start session
 *
 * Billing mode cannot be changed after step 1 is confirmed.
 */
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  X, User, Phone, Clock, Zap, Sliders, Play, Loader2,
  MessageSquare, ChevronDown, Timer, Coffee, CheckCircle2, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BillingMode } from '../types'
import { startSession } from '../lib/services/sessions'
import { createClient } from '../lib/services/clients'
import { format } from 'date-fns'

type Step = 'mode' | 'details' | 'confirm'

const STEP_LABELS: Record<Step, string> = {
  mode: 'Mode',
  details: 'Infos',
  confirm: 'Confirmer',
}
const STEPS: Step[] = ['mode', 'details', 'confirm']

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state as { clientName?: string; clientPhone?: string; clientId?: string } | null

  const { cafe, staff, type } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [step, setStep] = useState<Step>('mode')
  const [billingMode, setBillingMode] = useState<BillingMode | null>(null)
  const [modeConfirmed, setModeConfirmed] = useState(false)

  const [customerName, setCustomerName] = useState(prefill?.clientName || '')
  const [customerPhone, setCustomerPhone] = useState(prefill?.clientPhone || '')
  const [clientId] = useState<string | null>(prefill?.clientId || null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 10) val = val.slice(0, 10)
    const parts: string[] = []
    for (let i = 0; i < val.length; i += 2) parts.push(val.slice(i, i + 2))
    setCustomerPhone(parts.join(' '))
  }

  const effectiveRate =
    rateType === 'standard' ? (cafe?.default_rate ?? 0)
    : rateType === 'premium' ? (cafe?.premium_rate ?? 0)
    : customRate

  const occupiedSeats = activeSessions.map(s => s.seat_number)

  const handleStartSession = async () => {
    if (!cafe || !customerName || !selectedSeat || !billingMode) return
    if (activeSessions.some(s => s.seat_number === selectedSeat)) {
      addToast("Cette place est déjà occupée", "error")
      return
    }
    setIsLoading(true)
    try {
      await startSession({
        cafeId: cafe.id,
        staffId: type === 'staff' ? (staff?.id ?? null) : null,
        clientAccountId: clientId,
        customerName,
        customerPhone: customerPhone || null,
        seatNumber: selectedSeat,
        ratePerHour: effectiveRate,
        billingMode,
        notes: notes || null,
      })

      await logAction('session_started', {
        customer_name: customerName,
        seat_number: selectedSeat,
        rate_per_hour: effectiveRate,
        billing_mode: billingMode,
      })

      addToast(`Session démarrée — Place ${selectedSeat}`, "success")
      navigate('/dashboard')
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const goBack = () => {
    const idx = STEPS.indexOf(step)
    if (idx === 0) navigate(-1)
    else if (step === 'confirm') setStep('details')
    else if (step === 'details') {
      setStep('mode')
      setModeConfirmed(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-36">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={goBack} aria-label="Retour" className="p-2 -ml-2 text-text3 hover:text-text">
          {step === 'mode' ? <X size={20} /> : <ChevronLeft size={20} />}
        </button>
        <h1 className="text-sm font-bold text-text">{t('sessions.new')}</h1>
        <div className="w-8" />
      </header>

      <main className="pt-20 px-4 space-y-8">
        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 ${step === s ? 'text-accent' : STEPS.indexOf(step) > i ? 'text-success' : 'text-text3'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  step === s ? 'bg-accent border-accent text-white'
                  : STEPS.indexOf(step) > i ? 'bg-success border-success text-white'
                  : 'border-text3 text-text3'
                }`}>
                  {STEPS.indexOf(step) > i ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ───── STEP 1: Billing mode ───── */}
          {step === 'mode' && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-extrabold text-text mb-1">Mode de facturation</h2>
                <p className="text-xs text-text3">Ce choix est définitif pour cette session.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Time mode */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setBillingMode('time')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    billingMode === 'time'
                      ? 'bg-accent-glow border-accent shadow-[0_0_24px_rgba(249,115,22,0.15)]'
                      : 'bg-surface border-border hover:border-text3'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${billingMode === 'time' ? 'bg-accent text-white' : 'bg-surface2 text-text3'}`}>
                      <Timer size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-base font-extrabold text-text">⏱ TEMPS</div>
                        {billingMode === 'time' && <CheckCircle2 size={18} className="text-accent" />}
                      </div>
                      <p className="text-xs text-text2 mt-1.5 leading-relaxed">
                        Le client paie selon la durée. Les commandes sont suivies mais non facturées.
                      </p>
                    </div>
                  </div>
                </motion.button>

                {/* Consumption mode */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setBillingMode('consumption')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    billingMode === 'consumption'
                      ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.1)]'
                      : 'bg-surface border-border hover:border-text3'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${billingMode === 'consumption' ? 'bg-blue-500 text-white' : 'bg-surface2 text-text3'}`}>
                      <Coffee size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-base font-extrabold text-text">☕ CONSOMMATION</div>
                        {billingMode === 'consumption' && <CheckCircle2 size={18} className="text-blue-400" />}
                      </div>
                      <p className="text-xs text-text2 mt-1.5 leading-relaxed">
                        Le client paie uniquement ses commandes. Le temps est affiché mais jamais facturé.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Confirmation notice */}
              <AnimatePresence>
                {billingMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl border text-xs font-medium ${
                      billingMode === 'time'
                        ? 'bg-accent-glow border-accent-border text-accent2'
                        : 'bg-blue-500/5 border-blue-500/20 text-blue-300'
                    }`}
                  >
                    Vous avez choisi : <strong>{billingMode === 'time' ? 'Temps' : 'Consommation'}</strong>. Cette sélection est définitive pour cette session.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ───── STEP 2: Client & table ───── */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Client info */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">Client</label>
                <div className="space-y-3">
                  <Input
                    placeholder="Nom du client"
                    icon={<User size={18} />}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-14 text-lg"
                    autoFocus
                    rightElement={customerName && (
                      <button onClick={() => setCustomerName('')} className="text-text3"><X size={16} /></button>
                    )}
                  />
                  <Input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="06 00 00 00 00"
                    icon={<Phone size={18} />}
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    className="h-14 text-[19px] tracking-widest font-mono font-bold"
                    rightElement={customerPhone && (
                      <button onClick={() => setCustomerPhone('')} className="text-text3 p-1"><X size={16} /></button>
                    )}
                  />
                </div>
              </section>

              {/* Seat grid */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">Sélectionner une place</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {Array.from({ length: cafe?.total_seats || 20 }).map((_, i) => {
                    const seatNum = i + 1
                    const isOccupied = occupiedSeats.includes(seatNum)
                    const isSelected = selectedSeat === seatNum
                    return (
                      <motion.button
                        key={seatNum}
                        whileTap={!isOccupied ? { scale: 0.92 } : {}}
                        onClick={() => !isOccupied && setSelectedSeat(seatNum)}
                        className={`h-14 flex flex-col items-center justify-center rounded-xl border transition-all relative ${
                          isOccupied
                            ? 'bg-error/5 border-error/20 text-error/40 cursor-not-allowed'
                            : isSelected
                              ? 'bg-accent-glow border-accent text-accent2 shadow-[0_0_12px_rgba(249,115,22,0.2)] scale-105 z-10'
                              : 'bg-surface border-border text-text2 hover:border-text3'
                        }`}
                      >
                        <span className="text-lg font-mono font-bold">{seatNum}</span>
                        {isOccupied && <span className="text-[8px] font-bold uppercase absolute bottom-1">Occ.</span>}
                      </motion.button>
                    )
                  })}
                </div>
              </section>

              {/* Rate */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">{t('sessions.rate')}</label>
                <div className="space-y-2">
                  {[
                    { id: 'standard', icon: Clock, label: 'Standard', rate: cafe?.default_rate },
                    { id: 'premium', icon: Zap, label: 'Premium', rate: cafe?.premium_rate },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRateType(opt.id as any)}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${rateType === opt.id ? 'bg-accent-glow border-accent' : 'bg-surface border-border'}`}
                    >
                      <div className="flex items-center gap-3">
                        <opt.icon size={18} className={rateType === opt.id ? 'text-accent' : 'text-text3'} />
                        <div className="text-left">
                          <div className="text-sm font-bold text-text">{opt.label}</div>
                          <div className="text-xs text-text2">{opt.rate?.toFixed(2)} DH / heure</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${rateType === opt.id ? 'bg-accent border-accent' : 'border-border'}`}>
                        {rateType === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}

                  <div className={`rounded-xl border transition-all overflow-hidden ${rateType === 'custom' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'}`}>
                    <button onClick={() => setRateType('custom')} className="w-full p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sliders size={18} className={rateType === 'custom' ? 'text-accent' : 'text-text3'} />
                        <div className="text-sm font-bold text-text">Personnalisé</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${rateType === 'custom' ? 'bg-accent border-accent' : 'border-border'}`}>
                        {rateType === 'custom' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {rateType === 'custom' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4">
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Tarif horaire en DH"
                            value={customRate || ''}
                            onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                            rightElement={<span className="text-xs font-bold text-text3">DH/h</span>}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section className="space-y-2">
                <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-2 text-text3 hover:text-text2 transition-colors">
                  <MessageSquare size={16} />
                  <span className="text-xs font-medium">Ajouter une note</span>
                  <ChevronDown size={14} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showNotes && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <textarea className="input h-24 py-3 resize-none" placeholder="Note interne..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          )}

          {/* ───── STEP 3: Confirmation ───── */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-extrabold text-text mb-1">Confirmation</h2>
                <p className="text-xs text-text3">Vérifiez les informations avant de démarrer.</p>
              </div>

              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-lg">
                    {customerName[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text">{customerName}</div>
                    {customerPhone && <div className="text-xs text-text3">{customerPhone}</div>}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text3">Place</span>
                    <span className="text-sm font-bold text-text">Place {selectedSeat}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text3">Tarif</span>
                    <span className="text-sm font-bold text-accent2">{effectiveRate.toFixed(2)} DH/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text3">Mode de facturation</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      billingMode === 'time'
                        ? 'bg-accent-glow text-accent2 border border-accent-border'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {billingMode === 'time' ? '⏱ Temps' : '☕ Consommation'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text3">Heure de début</span>
                    <span className="text-sm font-mono font-bold text-text">{format(new Date(), 'HH:mm')}</span>
                  </div>
                  {notes && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-text3 shrink-0">Note</span>
                      <span className="text-xs text-text2 text-right">{notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg to-transparent pt-12 z-50">
        {step === 'mode' && (
          <Button
            onClick={() => { setModeConfirmed(true); setStep('details') }}
            className="w-full h-14 text-lg"
            disabled={!billingMode}
          >
            Continuer →
          </Button>
        )}

        {step === 'details' && (
          <Button
            onClick={() => setStep('confirm')}
            className="w-full h-14 text-lg"
            disabled={!customerName || !selectedSeat}
          >
            Vérifier et confirmer →
          </Button>
        )}

        {step === 'confirm' && (
          <Button
            onClick={handleStartSession}
            className="w-full h-14 text-lg"
            disabled={!customerName || !selectedSeat || !billingMode}
            isLoading={isLoading}
          >
            <Play size={20} className="fill-current" />
            Démarrer la session
          </Button>
        )}
      </div>
    </div>
  )
}
