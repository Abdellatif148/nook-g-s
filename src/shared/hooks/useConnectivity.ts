import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    const handleOnline = () => checkActualConnectivity();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check
    const interval = setInterval(checkActualConnectivity, 30000);

    // Initial check
    checkActualConnectivity();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  async function checkActualConnectivity() {
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }

    try {
      // Lightweight query to confirm connection to Supabase
      const { error } = await supabase.from('cafes').select('id').limit(1);
      if (error) throw error;
      setIsOnline(true);
    } catch (err) {
      // If navigator says online but ping fails, we are effectively offline
      setIsOnline(false);
    }
  }

  return { isOnline, lastSyncAt, setLastSyncAt, syncStatus, setSyncStatus };
}
