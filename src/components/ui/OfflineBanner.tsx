import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'

export const OfflineBanner = () => {
  const { t } = useTranslation()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48 }}
          animate={{ y: 56 }}
          exit={{ y: -48 }}
          className="fixed left-0 right-0 h-12 bg-[rgba(245,158,11,0.08)] border-b border-[rgba(245,158,11,0.2)] flex items-center justify-center gap-2 z-[90]"
        >
          <WifiOff size={14} className="text-warning" />
          <span className="text-[13px] font-medium text-warning">{t('common.offline')}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
