/**
 * Persistent banner shown when the app detects no internet connection.
 * Shows a spinner while the outbox is syncing and a checkmark on success.
 */
import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { useConnectivity } from '../hooks/useConnectivity'

export function OfflineBanner() {
  const { isOnline, lastSyncAt, pendingCount, syncStatus } = useConnectivity()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-warning text-black px-4 py-2.5 flex items-center justify-between gap-3"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={15} className="shrink-0" />
            <span className="text-xs font-bold leading-tight">
              Hors ligne — Les données seront synchronisées dès le retour de la connexion
              {pendingCount > 0 && (
                <span className="ml-1 opacity-70">
                  ({pendingCount} action{pendingCount > 1 ? 's' : ''} en attente)
                </span>
              )}
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-1 text-[10px] opacity-80">
            {syncStatus === 'syncing' && (
              <RefreshCw size={12} className="animate-spin" />
            )}
            {syncStatus === 'error' && (
              <AlertCircle size={12} className="text-red-700" />
            )}
            {syncStatus === 'idle' && lastSyncAt && (
              <>
                <CheckCircle2 size={12} />
                <span>{lastSyncAt.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
