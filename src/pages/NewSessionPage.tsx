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
  MessageSquare,
  ChevronDown,
  Play,
  Eye,
  Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { format } from 'date-fns'

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type, owner, staff } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const { addToast } = useUIStore()

  const [isLoading, setIsLoading] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [recentCustomers, setRecentCustomers] = useState<string[]>([])

  useEffect(() => {
    const loadRecents = async () => {
      if (!cafe) return
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
  }, [cafe])

  const occupiedSeats = activeSessions.map(s => s.seat_number)

  const handleStartSession = async () => {
    if (!customerName || !selectedSeat || !cafe) return
    
    // Re-validate seat
    if (activeSessions.some(s => s.seat_number === selectedSeat)) {
      addToast("Cette place est déjà occupée", "error")
      return
    }

    setIsLoading(true)
    try {
      const rate = rateType === 'standard' ? cafe.default_rate : 
                   rateType === 'premium' ? cafe.premium_rate : customRate

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          cafe_id: cafe.id,
          staff_id: type === 'owner' ? owner?.id : staff?.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          seat_number: selectedSeat,
          rate_per_hour: rate,
          started_at: new Date().toISOString(),
          status: 'active',
          notes: notes.trim(),
          extras: [],
          extras_total: 0,
          total_amount: 0
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('audit_log').insert({
        cafe_id: cafe.id,
        staff_id: type === 'owner' ? owner?.id : staff?.id,
        is_owner: type === 'owner',
        action: 'session_started',
        details: { customer_name: customerName, seat_number: selectedSeat, rate_per_hour: rate }
      })

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
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/92 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text2 hover:text-text transition-colors">
          <X size={22} />
        </button>
        <span className="text-base font-bold text-text">{t('sessions.new')}</span>
        <div className="w-10" />
      </header>

      <main className="pt-20 px-4 space-y-7 relative z-10">
        {/* CUSTOMER SECTION */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-text3 uppercase tracking-[0.1em]">{t('session.customer') || 'Client'}</label>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder={t('session.customer_name') || 'Nom du client'}
              icon={<UserCircle size={16} />}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-[52px] text-base font-medium"
              rightElement={
                customerName && (
                  <button onClick={() => setCustomerName('')} className="text-text3 hover:text-text">
                    <X size={16} />
                  </button>
                )
              }
            />
            
            {recentCustomers.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] text-text3 whitespace-nowrap">{t('session.recents') }:</span>
                {recentCustomers.map(name => (
                  <motion.button
                    key={name}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCustomerName(name)}
                    className="flex-shrink-0 px-3 py-1 bg-surface2 border border-border rounded-full text-[13px] font-medium text-text2 active:bg-accent-glow active:text-accent2 active:border-accent-border transition-colors"
                  >
                    {name}
                  </motion.button>
                ))}
              </div>
            )}

            <Input
              type="tel"
              placeholder={t('session.phone') }
              icon={<Phone size={16} />}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </section>

        {/* SEAT SECTION */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-text3 uppercase tracking-widest">{t('session.seat') }</label>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: cafe?.total_seats || 20 }).map((_, i) => {
              const seatNum = i + 1
              const isOccupied = occupiedSeats.includes(seatNum)
              const isSelected = selectedSeat === seatNum
              
              return (
                <motion.button
                  key={seatNum}
                  whileTap={!isOccupied ? { scale: 0.90 } : {}}
                  onClick={() => !isOccupied && setSelectedSeat(seatNum)}
                  className={`h-14 flex flex-col items-center justify-center rounded-[10px] border transition-all relative ${
                    isOccupied 
                      ? 'bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.2)] text-error opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'bg-accent-glow border-2 border-accent text-accent2 shadow-[0_0_12px_rgba(249,115,22,0.2)] z-10'
                        : 'bg-surface border-border text-text2'
                  }`}
                  animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
                >
                  <span className="text-[15px] font-mono font-bold">{seatNum}</span>
                  {isOccupied && (
                    <span className="text-[9px] font-bold text-error/80 absolute bottom-1">
                      {activeSessions.find(s => s.seat_number === seatNum)?.customer_name[0]}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* RATE SECTION */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-text3 uppercase tracking-widest">{t('session.rate') }</label>
          <div className="space-y-2">
            {[
              { id: 'standard', icon: Clock, label: t('session.standard') , rate: cafe?.default_rate },
              { id: 'premium', icon: Zap, label: t('session.premium') , rate: cafe?.premium_rate },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRateType(r.id as any)}
                className={`w-full p-4 rounded-[10px] border flex items-center justify-between transition-all ${
                  rateType === r.id ? 'bg-accent-glow border-accent-border' : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <r.icon size={18} className="text-accent" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-text">{r.label}</div>
                    <div className="text-[12px] font-mono text-text2">{r.rate?.toFixed(2)} DH/h</div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full border ${
                  rateType === r.id ? 'bg-accent border-accent' : 'border-text3'
                }`} />
              </button>
            ))}

            <div className={`rounded-[10px] border transition-all overflow-hidden ${
              rateType === 'custom' ? 'bg-accent-glow border-accent-border' : 'bg-surface border-border'
            }`}>
              <button
                onClick={() => setRateType('custom')}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <SlidersHorizontal size={18} className="text-text2" />
                  <div className="text-sm font-bold text-text">{t('session.custom') }</div>
                </div>
                <div className={`w-3 h-3 rounded-full border ${
                  rateType === 'custom' ? 'bg-accent border-accent' : 'border-text3'
                }`} />
              </button>
              <AnimatePresence>
                {rateType === 'custom' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="px-4 pb-4"
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        placeholder={`DH/${t('wizard.step2.billing_increment') || 'h'}`}
                        value={customRate || ''}
                        onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                        className="font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-text3 font-mono">DH/h</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* NOTE SECTION */}
        <section className="space-y-2">
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center justify-between w-full py-1"
          >
            <div className="flex items-center gap-2 text-text3">
              <MessageSquare size={16} />
              <span className="text-[13px] font-medium">{t('session.note') }</span>
            </div>
            <ChevronDown size={16} className={`text-text3 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <textarea
                  className="input min-h-[80px] py-3 resize-none font-sans"
                  placeholder={t('session.note_placeholder') }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* PREVIEW */}
        <AnimatePresence>
          {customerName && selectedSeat && (
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="p-3.5 bg-surface2 border border-accent-border rounded-xl"
            >
              <div className="flex items-center gap-1.5 mb-2.5">
                <Eye size={12} className="text-text3" />
                <span className="text-[11px] font-bold text-text3 uppercase tracking-widest">{t('session.preview') }</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                <div>
                  <div className="text-[10px] text-text3 uppercase tracking-wider">Client</div>
                  <div className="text-[13px] font-bold text-text truncate">{customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text3 uppercase tracking-wider">Place</div>
                  <div className="text-[13px] font-mono font-bold text-accent2">{selectedSeat}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text3 uppercase tracking-wider">Tarif</div>
                  <div className="text-[13px] font-mono font-bold text-text">
                    {(rateType === 'custom' ? customRate : (rateType === 'premium' ? cafe?.premium_rate : cafe?.default_rate))?.toFixed(2)} DH/h
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-text3 uppercase tracking-wider">Début</div>
                  <div className="text-[13px] font-mono font-bold text-text">{format(new Date(), 'HH:mm')}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FIXED BOTTOM ACTION */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg/80 to-transparent pt-8 z-50">
        <Button
          onClick={handleStartSession}
          className="w-full h-[52px]"
          disabled={!customerName || !selectedSeat}
          isLoading={isLoading}
        >
          <Play size={18} className="fill-current" />
          {t('session.start')}
        </Button>
      </div>
    </div>
  )
}
