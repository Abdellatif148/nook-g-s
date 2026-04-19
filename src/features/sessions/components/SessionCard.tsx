import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Armchair, StopCircle, AlertCircle } from 'lucide-react'
import { Session } from '../../../types'
import { useTranslation } from '../../../shared/hooks/useTranslation'
import { useAuthStore } from '../../../stores/authStore'
import { formatDuration, calculateDurationMinutes } from '../../../shared/utils/billing'

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
      const duration = calculateDurationMinutes(session.started_at, new Date().toISOString())
      setElapsed(formatDuration(duration * 60))

      const rate = Number(session.rate_per_hour) || 0
      setAmount((duration / 60) * rate + (Number(session.extras_total) || 0))

      const alertHours = cafe?.long_session_alert_hours || 3
      if (duration / 60 >= alertHours) setIsLong(true)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [session, cafe])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${
        isLong ? 'border-warning/40 bg-warning-dim/10' : 'bg-surface2 border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full flex items-center gap-1 text-accent">
            <Armchair size={11} />
            <span className="text-[11px] font-bold font-mono">Place {session.seat_number}</span>
          </div>
          <span className="text-sm font-semibold text-text">{session.customer_name}</span>
        </div>
        <div className="text-[11px] text-text3 font-mono">
            {session.billing_mode === 'time' ? `${session.rate_per_hour.toFixed(2)} DH/h` : 'CONSO'}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-8">
          <div>
            <span className="text-[10px] text-text3 font-medium uppercase block">Durée</span>
            <span className="text-[24px] font-mono font-bold text-text leading-tight">{elapsed}</span>
          </div>
          <div>
            <span className="text-[10px] text-text3 font-medium uppercase block">Total</span>
            <span className="text-[20px] font-mono font-bold text-accent leading-tight">{amount.toFixed(2)} DH</span>
          </div>
        </div>

        <button
          onClick={() => onEnd(session)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[13px] font-bold"
        >
          <StopCircle size={14} />
          Gérer
        </button>
      </div>
    </motion.div>
  )
}
