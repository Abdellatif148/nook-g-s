import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft, Users, Clock, Zap, Play,
  Armchair, CheckCircle2, Search, Sliders, X
} from 'lucide-react'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from '../../i18n'
import { supabase } from '../../lib/supabase'
import { ClientAccount } from '../../types'
import { smartWrite } from '../../lib/offline/writeHelper'

type Step = 'mode' | 'details' | 'confirm'

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, staff } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)

  const [step, setStep] = useState<Step>('mode')
  const [billingMode, setBillingMode] = useState<'time' | 'consumption' | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([])

  const [clients, setClients] = useState<ClientAccount[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null)

  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadOccupiedSeats = async () => {
      if (!cafe) return
      const { data } = await supabase
        .from('sessions')
        .select('seat_number')
        .eq('cafe_id', cafe.id)
        .eq('status', 'active')
      if (data) setOccupiedSeats(data.map(s => s.seat_number))
    }

    const loadClients = async () => {
      if (!cafe) return
      const { data } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('cafe_id', cafe.id)
        .order('name')
      if (data) setClients(data)
    }

    loadOccupiedSeats()
    loadClients()
  }, [cafe])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  )

  const handleSelectClient = (client: ClientAccount) => {
    setSelectedClient(client)
    setCustomerName(client.name)
    setSearchQuery('')
  }

  const handleStartSession = async () => {
    if (!cafe || !billingMode || !selectedSeat || !customerName) return

    setIsLoading(true)
    try {
      const sessionId = crypto.randomUUID()
      const rate = billingMode === 'consumption' ? 0 : (
        rateType === 'standard' ? cafe.default_rate :
        rateType === 'premium' ? cafe.premium_rate :
        customRate
      )

      const payload = {
        id: sessionId,
        cafe_id: cafe.id,
        staff_id: staff?.id || null,
        customer_name: customerName,
        customer_phone: selectedClient?.phone || null,
        client_account_id: selectedClient?.id || null,
        seat_number: selectedSeat,
        billing_mode: billingMode,
        rate_per_hour: rate,
        rate: rate,
        rate_unit: 60,
        started_at: new Date().toISOString(),
        status: 'active',
        extras: [],
        extras_total: 0,
        total_amount: 0
      }

      const result = await smartWrite('sessions', 'open_session', payload, payload)

      if (result) {
        addToast("Session démarrée", "success")
        navigate(`/sessions/${sessionId}`)
      }
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border px-4 h-16 flex items-center gap-3">
        <button onClick={() => step === 'mode' ? navigate(-1) : setStep(step === 'confirm' ? 'details' : 'mode')} className="p-2 -ml-2 text-text2 hover:text-text transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-text">Nouvelle Session</h1>
      </header>

      <main className="pt-24 px-4 space-y-8 max-w-lg mx-auto">
        <div className="flex gap-2">
           {['mode', 'details', 'confirm'].map((s, i) => (
             <div key={s} className={`h-1 flex-1 rounded-full transition-all ${
               (step === s || (step === 'details' && i === 0) || (step === 'confirm')) ? 'bg-accent' : 'bg-surface2'
             }`} />
           ))}
        </div>

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

              <div className="grid gap-4">
                <button
                  onClick={() => { setBillingMode('time'); setStep('details'); }}
                  className="p-6 bg-surface border border-border rounded-2xl text-left hover:border-success transition-all group"
                >
                  <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center text-success mb-4 group-hover:scale-110 transition-transform">
                    <Clock size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-text mb-1">Mode TEMPS</h3>
                  <p className="text-xs text-text3 leading-relaxed">Le client paie selon la durée. Les commandes sont suivies mais non facturées.</p>
                </button>

                <button
                  onClick={() => { setBillingMode('consumption'); setStep('details'); }}
                  className="p-6 bg-surface border border-border rounded-2xl text-left hover:border-warning transition-all group"
                >
                  <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center text-warning mb-4 group-hover:scale-110 transition-transform">
                    <Zap size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-text mb-1">Mode CONSOMMATION</h3>
                  <p className="text-xs text-text3 leading-relaxed">Le client paie uniquement ses commandes. Le temps est affiché mais jamais facturé.</p>
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
              className="space-y-8"
            >
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" size={18} />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Rechercher ou nom du client..."
                    value={customerName || searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCustomerName(e.target.value)
                      if (selectedClient) setSelectedClient(null)
                    }}
                  />
                  {searchQuery && filteredClients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {filteredClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full p-4 text-left border-b border-border last:border-0 hover:bg-surface2 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-bold text-text">{client.name}</div>
                            <div className="text-xs text-text3">{client.phone || 'Pas de téléphone'}</div>
                          </div>
                          <Users size={16} className="text-text3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">Place</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {Array.from({ length: cafe?.total_seats || 20 }).map((_, i) => {
                    const seatNum = i + 1
                    const isOccupied = occupiedSeats.includes(seatNum)
                    const isSelected = selectedSeat === seatNum
                    return (
                      <button
                        key={seatNum}
                        onClick={() => !isOccupied && setSelectedSeat(seatNum)}
                        className={`h-14 flex flex-col items-center justify-center rounded-xl border transition-all ${
                          isOccupied
                            ? 'bg-error/5 border-error/20 text-error/40 cursor-not-allowed'
                            : isSelected
                              ? 'bg-accent-glow border-accent text-accent2 shadow-lg shadow-accent/10 scale-105 z-10'
                              : 'bg-surface border-border text-text2'
                        }`}
                      >
                        <span className="text-lg font-mono font-bold">{seatNum}</span>
                        {isOccupied && <span className="text-[8px] font-bold uppercase">Occ.</span>}
                      </button>
                    )
                  })}
                </div>
              </section>

              <Button
                className="w-full h-14"
                disabled={!customerName || !selectedSeat}
                onClick={() => setStep('confirm')}
              >
                Continuer
              </Button>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="step-confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                 <div className="p-6 border-b border-border flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                       <Users size={24} />
                    </div>
                    <div>
                       <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-0.5">Client</div>
                       <div className="text-lg font-bold text-text">{customerName}</div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2">
                    <div className="p-6 border-r border-border">
                       <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-1">Place</div>
                       <div className="flex items-center gap-2 text-text font-bold">
                          <Armchair size={16} className="text-accent" />
                          <span>Place {selectedSeat}</span>
                       </div>
                    </div>
                    <div className="p-6">
                       <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-1">Mode</div>
                       <div className={`flex items-center gap-2 font-bold ${billingMode === 'time' ? 'text-success' : 'text-warning'}`}>
                          {billingMode === 'time' ? <Clock size={16} /> : <Zap size={16} />}
                          <span>{billingMode === 'time' ? 'Temps' : 'Conso'}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {billingMode === 'time' && (
                <section className="space-y-4">
                  <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">Tarif horaire</label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setRateType('standard')}
                      className={`p-4 rounded-xl border flex items-center justify-between ${rateType === 'standard' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'}`}
                    >
                      <span className="text-sm font-bold text-text">Standard (${cafe?.default_rate.toFixed(2)} DH/h)</span>
                      <CheckCircle2 size={18} className={`transition-opacity ${rateType === 'standard' ? 'opacity-100 text-accent' : 'opacity-0'}`} />
                    </button>
                    <button
                      onClick={() => setRateType('premium')}
                      className={`p-4 rounded-xl border flex items-center justify-between ${rateType === 'premium' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'}`}
                    >
                      <span className="text-sm font-bold text-text">Premium (${cafe?.premium_rate.toFixed(2)} DH/h)</span>
                      <CheckCircle2 size={18} className={`transition-opacity ${rateType === 'premium' ? 'opacity-100 text-accent' : 'opacity-0'}`} />
                    </button>
                  </div>
                </section>
              )}

              <Button
                onClick={handleStartSession}
                className="w-full h-14 text-lg"
                isLoading={isLoading}
              >
                <Play size={20} className="fill-current" />
                Démarrer la session
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
