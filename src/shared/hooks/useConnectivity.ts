import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useConnectivityStore } from '../../stores/connectivityStore';

export const useConnectivity = () => {
  const { isOnline, lastSyncAt, syncStatus, setIsOnline } = useConnectivityStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const pingInterval = setInterval(async () => {
      try {
        const { error } = await supabase.from('cafes').select('id').limit(1);
        if (error) throw error;
        if (!isOnline) setIsOnline(true);
      } catch (err) {
        if (isOnline) setIsOnline(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, [isOnline, setIsOnline]);

  return { isOnline, lastSyncAt, syncStatus };
};
