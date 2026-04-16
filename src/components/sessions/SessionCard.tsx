import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Armchair, StopCircle, Zap, AlertCircle } from 'lucide-react'
import { Session } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuthStore } from '../../stores/authStore'

interface SessionCardProps {
  session: Session
  onEnd: (session: Session) => void
}

export const SessionCard = ({ session, onEnd }: SessionCardProps) => {
  const { t } = useTranslation()
  const { cafe } = useAuthStore()
  const [elapsed, setElapsed] = useState('00:00:00')
  const [amount, setAmount] = useState(0)
  const [isLong, setIsLong] = useState(false)

  useEffect(() => {
    const update = () => {
      const start = new Date(session.started_at).getTime()
      const now = Date.now()
      const diffSec = Math.floor((now - start) / 1000)
      
      const hours = Math.floor(diffSec / 3600)
      const minutes = Math.floor((diffSec % 3600) / 60)
      const seconds = diffSec % 60
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      
      // Calculate amount (update every minute for billing logic, but here we update for display)
      const durationHours = diffSec / 3600
      const calculatedAmount = durationHours * session.rate_per_hour
      setAmount(calculatedAmount + session.extras_total)
      
      // Check for long session
      const alertHours = cafe?.long_session_alert_hours || 3
      if (hours >= alertHours) setIsLong(true)
    }

    update()
    const interval = setInterval(update, 1000)

    // Accuracy on visibility change
    const handleVisibility = () => { if (document.visibilityState === 'visible') update() }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [session, cafe])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card relative overflow-hidden ${
        isLong ? 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.03)]' : ''
      }`}
    >
      {isLong && (
        <div className="absolute top-0 left-0 right-0 h-7 bg-[rgba(245,158,11,0.08)] flex items-center px-4 gap-2">
          <AlertCircle size={12} className="text-warning" />
          <span className="text-[11px] font-bold text-warning uppercase tracking-wider">{t('sessions.long_warning') || 'Session Longue'}</span>
        </div>
      )}

      <div className={`flex items-center justify-between ${isLong ? 'mt-6' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="bg-accent-glow border border-accent-border px-2.5 py-1 rounded-full flex items-center gap-1 text-accent2">
            <Armchair size={11} />
            <span className="text-[11px] font-bold font-mono">Place {session.seat_number}</span>
          </div>
          <span className="text-sm font-semibold text-text">{session.customer_name}</span>
        </div>
        <div className="bg-surface2 border border-border px-2 py-0.5 rounded-full text-[11px] text-text3 font-mono">
          {session.rate_per_hour.toFixed(2)} DH/h
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-8">
          <div>
            <span className="text-[10px] text-text3 font-medium uppercase block">{t('sessions.duration')}</span>
            <span className="text-[28px] font-mono font-bold text-text leading-tight">{elapsed}</span>
          </div>
          <div>
            <span className="text-[10px] text-text3 font-medium uppercase block">{t('sessions.amount')}</span>
            <span className="text-[22px] font-mono font-bold text-accent2 leading-tight">{amount.toFixed(2)} DH</span>
          </div>
        </div>

        <button
          onClick={() => onEnd(session)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-error-dim border border-[rgba(239,68,68,0.2)] text-error rounded-lg text-[13px] font-bold active:scale-95 transition-all"
        >
          <StopCircle size={14} />
          {t('sessions.end')}
        </button>
      </div>
    </motion.div>
  )
}
