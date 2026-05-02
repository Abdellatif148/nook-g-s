import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from '../../i18n';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="fixed top-14 left-0 right-0 h-12 bg-warning/10 border-b border-[rgba(245,158,11,0.2)] flex items-center justify-center gap-2 z-40"
        >
          <WifiOff className="w-3.5 h-3.5 text-warning" />
          <span className="text-[13px] font-medium text-warning">
            {t('common.offline') || 'Hors ligne. Les modifications locales seront synchronisées plus tard.'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
