import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'

interface AlertBannerProps {
  show: boolean
  message: string
}

export const AlertBanner = ({ show, message }: AlertBannerProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3 bg-error-dim border border-[rgba(239,68,68,0.2)] rounded-xl flex items-center gap-3 text-error"
        >
          <AlertTriangle size={16} />
          <span className="text-[13px] font-semibold">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
