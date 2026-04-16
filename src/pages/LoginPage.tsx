import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Store, Users, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ChevronLeft, Delete, Check, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../hooks/useTranslation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PINDots } from '../components/ui/PINDots'
import { NumPad } from '../components/ui/NumPad'
import { Select } from '../components/ui/Select'
import { hashPin } from '../lib/crypto'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setOwner, setCafe, setStaff, setLoading } = useAuthStore()
  const { addToast } = useUIStore()

  const [role, setRole] = useState<'owner' | 'staff'>('owner')
  const [isLoading, setIsLoading] = useState(false)

  // Owner fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Staff fields
  const [staffStep, setStaffStep] = useState(1)
  const [inviteCode, setInviteCode] = useState('')
  const [cafeForStaff, setCafeForStaff] = useState<any>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [lockout, setLockout] = useState(0)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (lockout > 0) {
      const timer = setInterval(() => setLockout(l => l - 1), 1000)
      return () => clearInterval(timer)
    }
  }, [lockout])

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      const { data: cafe } = await supabase
        .from('cafes')
        .select('*')
        .eq('owner_id', data.user.id)
        .single()

      setOwner(data.user)
      if (cafe) {
        setCafe(cafe)
        if (cafe.setup_complete) {
          navigate('/dashboard')
        } else {
          navigate('/wizard')
        }
      } else {
        navigate('/wizard')
      }
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteCodeSubmit = async () => {
    if (inviteCode.length < 6) return
    setIsLoading(true)
    try {
      const { data: cafe, error } = await supabase
        .from('cafes')
        .select('*')
        .eq('invite_code', inviteCode)
        .single()
      
      if (error || !cafe) {
        addToast(t('auth.code_incorrect'), 'error')
        return
      }

      const { data: staff } = await supabase
        .from('staff')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('active', true)
      
      setCafeForStaff(cafe)
      setStaffList(staff || [])
      setStaffStep(2)
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinPress = (val: string) => {
    if (pin.length >= 4 || lockout > 0) return
    const newPin = pin + val
    setPin(newPin)
    if (newPin.length === 4) {
      handleStaffLogin(newPin)
    }
  }

  const handleStaffLogin = async (finalPin: string) => {
    if (!selectedStaff || !cafeForStaff) return
    setIsLoading(true)
    try {
      const hashed = await hashPin(finalPin)
      if (hashed === selectedStaff.pin_hash) {
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 12)
        
        const session = {
          type: 'staff',
          staff_id: selectedStaff.id,
          cafe_id: cafeForStaff.id,
          name: selectedStaff.name,
          permissions: selectedStaff.permissions,
          expires_at: expiresAt.toISOString(),
        }
        
        localStorage.setItem('nook_staff_session', JSON.stringify(session))
        setStaff(selectedStaff)
        setCafe(cafeForStaff)
        navigate('/dashboard')
      } else {
        setPinError(true)
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= 3) {
          setLockout(30)
          setAttempts(0)
          addToast("Trop de tentatives. Bloqué pendant 30s", "error")
        }

        setTimeout(() => {
          setPin('')
          setPinError(false)
        }, 600)
      }
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
    if (paste.length === 6) {
      setInviteCode(paste)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-surface border border-border rounded-2xl p-8 shadow-2xl z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center text-white font-extrabold text-[22px] shadow-lg shadow-accent/20">
              N
            </div>
            <span className="text-xl font-bold text-text">Nook OS</span>
          </div>
          <p className="text-sm text-text2 mt-1.5">{t('auth.subtitle')}</p>
        </div>

        <div className="bg-surface2 p-[3px] rounded-[10px] flex mb-8 border border-border relative">
          <button
            onClick={() => setRole('owner')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all z-10"
          >
            <Store size={16} className={role === 'owner' ? 'text-accent' : 'text-text3'} />
            <span className={role === 'owner' ? 'text-text' : 'text-text3'}>{t('auth.owner')}</span>
          </button>
          <button
            onClick={() => setRole('staff')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all z-10"
          >
            <Users size={16} className={role === 'staff' ? 'text-accent' : 'text-text3'} />
            <span className={role === 'staff' ? 'text-text' : 'text-text3'}>{t('auth.staff')}</span>
          </button>

          <motion.div
            layoutId="tab-indicator"
            className="absolute inset-[3px] w-[calc(50%-3px)] bg-accent-glow border border-accent-border rounded-[7px] z-0"
            animate={{ x: role === 'owner' ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {role === 'owner' ? (
            <motion.form
              key="owner-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              onSubmit={handleOwnerLogin}
              className="space-y-4"
            >
              <Input
                type="email"
                autoComplete="email"
                placeholder={t('auth.email')}
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                icon={<Lock size={16} />}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-text3 hover:text-text transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t('auth.login')}
              </Button>
              <p className="text-center text-[13px] text-text2 pt-2">
                {t('auth.no_account')}
                <Link to="/register" className="text-accent2 hover:underline font-medium ml-1">
                  {t('auth.register_link')}
                </Link>
              </p>
            </motion.form>
          ) : (
            <motion.div
              key="staff-flow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {staffStep === 1 ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[12px] font-semibold text-text2 uppercase tracking-wider mb-2">
                      {t('auth.cafe_code')}
                    </label>
                    <div className="flex justify-between gap-2" onPaste={handlePaste}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input
                          key={i}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className="w-full aspect-[46/54] bg-black/30 border border-border rounded-lg text-center font-mono text-2xl font-bold text-text focus:border-accent outline-none shadow-inner"
                          value={inviteCode[i] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            if (val) {
                              const newCode = inviteCode.split('')
                              newCode[i] = val
                              setInviteCode(newCode.join(''))
                              if (i < 5) (e.target.nextSibling as HTMLInputElement)?.focus()
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !inviteCode[i] && i > 0) {
                              const newCode = inviteCode.split('')
                              newCode[i - 1] = ''
                              setInviteCode(newCode.join(''))
                              ;(e.target.previousSibling as HTMLInputElement)?.focus()
                            }
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[12px] text-text3 mt-3">{t('auth.cafe_code_hint')}</p>
                  </div>
                  <Button onClick={handleInviteCodeSubmit} className="w-full" isLoading={isLoading} disabled={inviteCode.length < 6}>
                    {t('common.continue')}
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 relative justify-center">
                    <button onClick={() => setStaffStep(1)} className="absolute left-0 p-2 -ml-2 text-text3 hover:text-text transition-colors">
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-[15px] font-semibold text-text">{cafeForStaff?.name}</h2>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Select
                        options={staffList.map(s => ({ id: s.id, name: s.name }))}
                        value={selectedStaff?.id || ''}
                        onChange={(id) => setSelectedStaff(staffList.find(s => s.id === id))}
                        placeholder={t('auth.your_name')}
                        icon={<Users size={16} />}
                      />
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-2">
                      <div className="flex flex-col items-center gap-2">
                        <label className="text-[12px] font-semibold text-text2 uppercase tracking-wider">{t('auth.pin')}</label>
                        <PINDots length={pin.length} error={pinError} />
                      </div>

                      <div className="relative w-full">
                        {lockout > 0 && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-bg/60 backdrop-blur-[2px] rounded-2xl">
                            <span className="text-error font-mono font-bold text-2xl">{lockout}s</span>
                            <span className="text-error text-[12px] font-bold mt-1 uppercase tracking-widest">Verrouillé</span>
                          </div>
                        )}
                        <NumPad
                          onPress={handlePinPress}
                          onDelete={() => setPin(pin.slice(0, -1))}
                          className={lockout > 0 ? 'opacity-40 grayscale' : ''}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
