import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useTranslation } from '../../hooks/useTranslation'
import { useConnectivity } from '../../hooks/useConnectivity'
import { runSync, refreshCaches } from '../../../lib/offline/sync'
import { useAuthStore } from '../../../stores/authStore'
import { useUIStore } from '../../../stores/uiStore'

export const OfflineBanner = () => {
  const { t } = useTranslation()
  const { isOnline, syncStatus, setSyncStatus, setLastSyncAt } = useConnectivity()
  const { cafe } = useAuthStore()
  const { addToast } = useUIStore()

  useEffect(() => {
    if (isOnline && cafe?.id) {
      const performSync = async () => {
        setSyncStatus('syncing')
        try {
          const syncResult = await runSync()
          await refreshCaches(cafe.id)
          setSyncStatus('success')
          setLastSyncAt(new Date())

          if (syncResult.processed > 0) {
            addToast(`Synchronisation réussie — ${syncResult.processed} éléments mis à jour`, 'success')
          }

          setTimeout(() => setSyncStatus('idle'), 3000)
        } catch (err) {
          console.error('Sync failed:', err)
          setSyncStatus('error')
        }
      }
      performSync()
    }
  }, [isOnline, cafe?.id])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48 }}
          animate={{ y: 56 }}
          exit={{ y: -48 }}
          className="fixed left-0 right-0 h-12 bg-warning-dim border-b border-[rgba(245,158,11,0.2)] flex items-center justify-center gap-2 z-[90] backdrop-blur-md"
        >
          <WifiOff size={14} className="text-warning" />
          <span className="text-[13px] font-medium text-warning">
            {t('common.offline') || 'Hors ligne — Les données seront synchronisées dès le retour de la connexion'}
          </span>
        </motion.div>
      )}

      {isOnline && syncStatus !== 'idle' && (
        <motion.div
          initial={{ y: -48 }}
          animate={{ y: 56 }}
          exit={{ y: -48 }}
          className="fixed left-0 right-0 h-12 bg-bg2 border-b border-border flex items-center justify-center gap-2 z-[90] backdrop-blur-md"
        >
          {syncStatus === 'syncing' && (
            <>
              <RefreshCw size={14} className="text-accent animate-spin" />
              <span className="text-[13px] font-medium text-text2">Synchronisation en cours...</span>
            </>
          )}
          {syncStatus === 'success' && (
            <>
              <CheckCircle2 size={14} className="text-success" />
              <span className="text-[13px] font-medium text-success">Synchronisation réussie</span>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <WifiOff size={14} className="text-error" />
              <span className="text-[13px] font-medium text-error">Erreur de synchronisation</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
