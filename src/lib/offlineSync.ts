import { supabase } from './supabase';
import { useSessionStore } from '../stores/sessionStore';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

export interface SyncOperation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

const getQueue = (): SyncOperation[] => {
  const queue = localStorage.getItem('nook-sync-queue');
  return queue ? JSON.parse(queue) : [];
};

const saveQueue = (queue: SyncOperation[]) => {
  localStorage.setItem('nook-sync-queue', JSON.stringify(queue));
};

export const queueMutation = async (
  table: string, 
  action: 'insert' | 'update' | 'delete', 
  payload: any, 
  optimisticData?: any
) => {
  if (navigator.onLine) {
    // Try online execution first
    try {
      let query = supabase.from(table);
      let response;
      if (action === 'insert') {
        response = await query.insert(payload).select().single();
      } else if (action === 'update') {
        response = await query.update(payload).eq('id', payload.id).select().single();
      } else if (action === 'delete') {
        response = await query.delete().eq('id', payload.id);
      }
      
      if (response && response.error) throw response.error;
      return response ? response.data : null;
    } catch (e: any) {
      if (!e.message?.includes('Failed to fetch') && navigator.onLine) {
        throw e; // Real error from database
      }
      // If it failed due to network, fallback to offline queue
    }
  }

  // Handle offline fallback
  const queue = getQueue();
  const opId = crypto.randomUUID();
  queue.push({
    id: opId,
    table,
    action,
    payload,
    timestamp: Date.now()
  });
  saveQueue(queue);

  // Optimistic update
  if (table === 'sessions') {
    const { addSession, updateSession } = useSessionStore.getState();
    if (action === 'insert') {
      addSession(optimisticData || { ...payload, id: opId });
    } else if (action === 'update') {
      updateSession(optimisticData || payload);
    }
  }

  useUIStore.getState().addToast("Sauvegardé hors ligne (sync lors de la reconnexion)", "info");
  
  return optimisticData || { ...payload, id: opId };
};

export const processSyncQueue = async () => {
  if (!navigator.onLine) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  let newQueue = [...queue];
  let hasErrors = false;

  for (const op of queue) {
    try {
      let query = supabase.from(op.table);
      
      // We might need to handle mapped generated UUIDs, but for our simple PWA we'll 
      // rely on supabase auto generating for inserts if ID is missing.
      // Actually, if we optimistic updated, we might have assigned a local UUID!
      // Here we just re-run the op payload.
      let payload = { ...op.payload };
      if (op.action === 'insert' && payload.id && payload.id.length > 36) { // if local fake ID
         delete payload.id;
      }

      if (op.action === 'insert') {
        await query.insert(payload);
      } else if (op.action === 'update') {
        await query.update(payload).eq('id', payload.id);
      } else if (op.action === 'delete') {
        await query.delete().eq('id', payload.id);
      }

      // Remove from queue upon success
      newQueue = newQueue.filter(item => item.id !== op.id);
    } catch (e) {
      console.error('Sync failed for op', op, e);
      hasErrors = true;
    }
  }

  saveQueue(newQueue);
  if (!hasErrors && queue.length > 0) {
    useUIStore.getState().addToast("Données synchronisées avec le serveur", "success");
  }
};

window.addEventListener('online', () => {
  processSyncQueue();
});
