import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface ConnectivityState {
  isOnline: boolean;
  lastSyncAt: Date | null;
  syncStatus: SyncStatus;
  setIsOnline: (online: boolean) => void;
  setLastSyncAt: (date: Date | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: navigator.onLine,
  lastSyncAt: null,
  syncStatus: 'idle',
  setIsOnline: (isOnline) => set({ isOnline }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}));
