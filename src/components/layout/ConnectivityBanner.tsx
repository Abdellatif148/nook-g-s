import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useConnectivity } from '../../shared/hooks/useConnectivity'

export const ConnectivityBanner = () => {
  const { isOnline, syncStatus } = useConnectivity()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-error text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
        >
          <WifiOff size={14} />
          <span>Hors ligne — Les données seront synchronisées dès le retour de la connexion</span>
        </motion.div>
      )}
      {isOnline && syncStatus === 'syncing' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
        >
          <RefreshCw size={14} className="animate-spin" />
          <span>Synchronisation en cours...</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
