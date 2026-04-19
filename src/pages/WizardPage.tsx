import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Store,
  MapPin,
  Navigation,
  Phone,
  Armchair,
  Clock,
  Zap,
  Timer,
  UserPlus,
  Rocket,
  Check,
  CheckCircle,
  Copy,
  ArrowRight,
  User,
  BarChart2,
  Users,
  Settings,
  ChevronDown
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../shared/hooks/useTranslation'
import { Button } from '../shared/components/ui/Button'
import { Input } from '../shared/components/ui/Input'
import { NumPad } from '../shared/components/ui/NumPad'
import { PINDots } from '../shared/components/ui/PINDots'
import { Toggle } from '../shared/components/ui/Toggle'
import { hashPin } from '../lib/crypto'

export default function WizardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { owner, setCafe } = useAuthStore()
  const { addToast } = useUIStore()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1: Cafe Info
  const [cafeName, setCafeName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2: Rates
  const [seats, setSeats] = useState(20)
  const [defaultRate, setDefaultRate] = useState(2.00)
  const [premiumRate, setPremiumRate] = useState(3.00)
  const [billingIncrement, setBillingIncrement] = useState('minute')

  // Step 3: First Staff
  const [addStaff, setAddStaff] = useState(false)
  const [staffName, setStaffName] = useState('')
  const [staffPin, setStaffPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isConfirmingPin, setIsConfirmingPin] = useState(false)
  const [permissions, setPermissions] = useState({
    sessions: true,
    reports: false,
    clients: false,
    settings: false
  })

  // Step 4: Invite Code
  const [inviteCode, setInviteCode] = useState('')

  const generateUniqueCode = async () => {
    let code = ''
    let isUnique = false
    while (!isUnique) {
      code = Math.floor(100000 + Math.random() * 900000).toString()
      const { data } = await supabase.from('cafes').select('id').eq('invite_code', code).single()
      if (!data) isUnique = true
    }
    return code
  }

  useEffect(() => {
    if (step === 4 && !inviteCode) {
      generateUniqueCode().then(setInviteCode)
    }
  }, [step])

  const handleFinish = async () => {
    setIsLoading(true)
    try {
      if (!owner) throw new Error("No owner found")

      const { data: cafe, error: cafeError } = await supabase
        .from('cafes')
        .insert({
          owner_id: owner.id,
          name: cafeName,
          city,
          address,
          phone,
          total_seats: seats,
          default_rate: defaultRate,
          premium_rate: premiumRate,
          billing_increment: billingIncrement,
          invite_code: inviteCode,
          setup_complete: true,
          language: 'fr',
          long_session_alert_hours: 3,
          low_balance_alert: 20
        })
        .select()
        .single()

      if (cafeError) throw cafeError

      if (addStaff && staffName && staffPin) {
        const pinHash = await hashPin(staffPin)
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            cafe_id: cafe.id,
            name: staffName,
            pin_hash: pinHash,
            active: true,
            permissions
          })
        if (staffError) throw staffError

        await supabase.from('audit_log').insert({
          cafe_id: cafe.id,
          staff_id: owner.id,
          is_owner: true,
          action: 'staff_created',
          details: { staff_name: staffName }
        })
      }

      setCafe(cafe)
      navigate('/dashboard')
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-[22px] font-extrabold text-text">{t('wizard.step1.title')}</h2>
              <p className="text-[13px] text-text2 mt-1">{t('wizard.step1.subtitle')}</p>
            </div>
            <div className="space-y-3 pt-4">
              <Input placeholder="Café Atlas..." icon={<Store size={16} className="text-accent" />} value={cafeName} onChange={(e) => setCafeName(e.target.value)} required />
              <Input placeholder="Ville..." icon={<MapPin size={16} />} value={city} onChange={(e) => setCity(e.target.value)} />
              <Input placeholder="Adresse..." icon={<Navigation size={16} />} value={address} onChange={(e) => setAddress(e.target.value)} />
              <Input type="tel" placeholder="+212..." icon={<Phone size={16} />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-7" disabled={!cafeName}>
              {t('common.next')} <ArrowRight size={18} />
            </Button>
          </motion.div>
        )
      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="text-[22px] font-extrabold text-text">{t('wizard.step2.title')}</h2>
              <p className="text-[13px] text-text2 mt-1">{t('wizard.step2.subtitle')}</p>
            </div>
            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text2 flex items-center gap-2"><Armchair size={14} /> {t('wizard.seats')}</label>
                <div className="flex items-center gap-4 bg-surface2 border border-border rounded-xl p-1.5">
                  <button onClick={() => setSeats(Math.max(1, seats - 1))} className="w-9 h-9 bg-surface border border-border rounded-lg text-text transition-all active:scale-90">-</button>
                  <input type="number" className="flex-1 text-center font-mono text-lg bg-transparent border-none outline-none" value={seats} onChange={(e) => setSeats(parseInt(e.target.value) || 0)} />
                  <button onClick={() => setSeats(Math.min(200, seats + 1))} className="w-9 h-9 bg-surface border border-border rounded-lg text-text transition-all active:scale-90">+</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text2 flex items-center gap-2"><Clock size={14} className="text-accent" /> {t('wizard.default_rate')}</label>
                <div className="relative">
                  <Input type="number" step="0.5" value={defaultRate} onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-text3 font-mono">DH/h</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text2 flex items-center gap-2"><Zap size={14} className="text-accent" /> {t('wizard.premium_rate')}</label>
                <div className="relative">
                  <Input type="number" step="0.5" value={premiumRate} onChange={(e) => setPremiumRate(parseFloat(e.target.value) || 0)} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-text3 font-mono">DH/h</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>{t('common.back')}</Button>
              <Button className="flex-[2]" onClick={() => setStep(3)}>{t('common.next')}</Button>
            </div>
          </motion.div>
        )
      case 3:
        return (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="text-[22px] font-extrabold text-text">{t('wizard.step3.title')}</h2>
              <p className="text-[13px] text-text2 mt-1">{t('wizard.step3.subtitle')}</p>
            </div>
            <div className="p-4 rounded-xl border bg-surface border-border flex items-center justify-between">
              <div className="flex items-center gap-3"><UserPlus size={20} className="text-accent" /><span className="text-sm font-medium text-text">{t('wizard.add_staff_now')}</span></div>
              <Toggle enabled={addStaff} onChange={setAddStaff} />
            </div>
            <AnimatePresence>
              {addStaff && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-hidden">
                  <Input placeholder={t('staff.name')} icon={<User size={18} />} value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2"><label className="text-[12px] font-semibold text-text2 uppercase">{isConfirmingPin ? t('staff.confirm_pin') : t('staff.pin_setup')}</label><PINDots length={isConfirmingPin ? confirmPin.length : staffPin.length} /></div>
                    <NumPad
                      onPress={(v) => {
                        const current = isConfirmingPin ? confirmPin : staffPin
                        if (current.length < 4) {
                          const updated = current + v
                          if (isConfirmingPin) setConfirmPin(updated)
                          else setStaffPin(updated)
                          if (updated.length === 4 && !isConfirmingPin) setIsConfirmingPin(true)
                        }
                      }}
                      onDelete={() => isConfirmingPin ? (confirmPin === '' ? setIsConfirmingPin(false) : setConfirmPin(confirmPin.slice(0, -1))) : setStaffPin(staffPin.slice(0, -1))}
                      className="w-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>{t('common.back')}</Button>
                <Button className="flex-[2]" onClick={() => setStep(4)} disabled={addStaff && (!staffName || staffPin.length < 4 || confirmPin !== staffPin)}>{t('common.next')}</Button>
              </div>
              {!addStaff && <button onClick={() => setStep(4)} className="text-[13px] text-text3 hover:text-text">{t('wizard.skip')}</button>}
            </div>
          </motion.div>
        )
      case 4:
        return (
          <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
            <div className="flex flex-col items-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="w-16 h-16 bg-success-dim text-success rounded-full flex items-center justify-center mb-4"><CheckCircle size={40} /></motion.div>
              <h2 className="text-[22px] font-extrabold text-text">{t('wizard.step4.title')}</h2>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[12px] font-semibold text-text2 uppercase tracking-widest">{t('wizard.invite_code')}</label>
              <div className="bg-surface2 border border-accent-border rounded-xl p-6 flex items-center justify-center font-mono text-[34px] font-bold text-accent2 tracking-[0.25em]">
                {inviteCode.split('').join(' ')}
              </div>
              <div className="flex justify-center mt-3">
                <Button variant="ghost" className="h-9 px-4 text-xs gap-2" onClick={() => { navigator.clipboard.writeText(inviteCode); addToast(t('common.copy'), "success") }}><Copy size={14} /> {t('wizard.copy_code')}</Button>
              </div>
            </div>
            <Button onClick={handleFinish} className="w-full h-14 text-lg" isLoading={isLoading}>{t('wizard.finish')} <ArrowRight size={20} /></Button>
          </motion.div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex flex-col items-center p-6 pt-12">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      {step < 4 && (
        <div className="w-full max-w-[500px] flex items-center justify-between mb-12 relative px-4">
          <div className="absolute top-[16px] left-10 right-10 h-[2px] bg-border z-0"><motion.div className="h-full bg-success" initial={{ width: 0 }} animate={{ width: `${(step - 1) * 50}%` }} /></div>
          {[Store, Clock, UserPlus, Rocket].map((Icon, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step === i + 1 ? 'bg-accent text-white scale-110' : step > i + 1 ? 'bg-success text-white' : 'bg-surface2 text-text3 border border-border'}`}>
                {step > i + 1 ? <Check size={16} /> : <Icon size={14} />}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="w-full max-w-[500px] z-10"><AnimatePresence mode="wait">{renderStep()}</AnimatePresence></div>
    </div>
  )
}
