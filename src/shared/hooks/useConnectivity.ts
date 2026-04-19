/**
 * useConnectivity — tracks real-time online/offline status.
 * Two-layer check:
 *   1. window 'online' / 'offline' events
 *   2. Periodic Supabase ping every 30 s (catches WiFi-connected-but-no-internet)
 *
 * Exposes syncStatus so the OfflineBanner can show a spinner while syncing.
 *
 * NOTE: runSync is imported dynamically to avoid pulling Dexie into the
 * initial module graph, which caused React hook call failures in Vite dev mode.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface ConnectivityState {
  isOnline: boolean
  lastSyncAt: Date | null
  pendingCount: number
  syncStatus: SyncStatus
}

const PING_INTERVAL_MS = 30_000

export function useConnectivity(): ConnectivityState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasOfflineRef = useRef(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  /** Confirm connectivity with a real Supabase request (uses spaces table per spec). */
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('cafes').select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }, [])

  /** Trigger outbox sync when we come back online. */
  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing')
    try {
      const { runSync } = await import('../../lib/offline/sync')
      const result = await runSync()
      setLastSyncAt(new Date())
      setPendingCount(0)
      setSyncStatus(result.failed > 0 ? 'error' : 'idle')
    } catch {
      setSyncStatus('error')
    }
  }, [])

  const handleOnline = useCallback(async () => {
    const confirmed = await verifyConnection()
    setIsOnline(confirmed)
    if (confirmed && wasOfflineRef.current) {
      wasOfflineRef.current = false
      await triggerSync()
    }
  }, [verifyConnection, triggerSync])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    wasOfflineRef.current = true
    setSyncStatus('idle')
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    pingTimerRef.current = setInterval(async () => {
      if (navigator.onLine) {
        const ok = await verifyConnection()
        if (!ok && isOnline) {
          setIsOnline(false)
          wasOfflineRef.current = true
        } else if (ok && !isOnline) {
          setIsOnline(true)
          if (wasOfflineRef.current) {
            wasOfflineRef.current = false
            await triggerSync()
          }
        }
      }
    }, PING_INTERVAL_MS)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    }
  }, [handleOnline, handleOffline, verifyConnection, isOnline, triggerSync])

  return { isOnline, lastSyncAt, pendingCount, syncStatus }
}
