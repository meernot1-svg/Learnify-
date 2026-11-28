import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../hooks/useLanguage';
import { flushOfflineQueue, getOfflineQueue, OFFLINE_SYNC_EVENT } from '../lib/offlineSync';

export const PWAInstallButton: React.FC = () => {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();
  const [pendingCount, setPendingCount] = useState<number>(() => getOfflineQueue().length);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => setPendingCount(getOfflineQueue().length);
    window.addEventListener(OFFLINE_SYNC_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_SYNC_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setSyncing(true);
      flushOfflineQueue().finally(() => {
        setPendingCount(getOfflineQueue().length);
        setSyncing(false);
      });
    }
  }, [isOnline, pendingCount]);

  return (
    <div className="flex items-center gap-1.5">
      {!isOnline && (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-wider"
          title="Working offline — completed labs queue locally and sync automatically once back online."
        >
          <WifiOff className="w-3 h-3" />
          <span className="hidden md:inline">{t('offlineBadge')}</span>
        </span>
      )}

      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={async () => {
            setSyncing(true);
            await flushOfflineQueue();
            setPendingCount(getOfflineQueue().length);
            setSyncing(false);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/25 transition-colors cursor-pointer"
          title="Sync queued offline records"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          <span>Sync ({pendingCount})</span>
        </button>
      )}

      {canInstall && (
        <button
          type="button"
          onClick={promptInstall}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          title="Install Learnify for offline access"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">{t('installApp')}</span>
        </button>
      )}

      {isInstalled && isOnline && pendingCount === 0 && (
        <span
          className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider"
          title="Learnify installed and synced"
        >
          <CheckCircle2 className="w-3 h-3" />
          App Ready
        </span>
      )}
    </div>
  );
};
