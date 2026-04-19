import { supabase } from '../supabase';
import { db } from './db';
import { enqueueAction } from './queue';

/**
 * Smart write helper that decides whether to go to Supabase or IndexedDB + Outbox.
 */
export async function smartWrite(
  action: 'open_session' | 'add_consumption' | 'close_session',
  table: string,
  payload: any,
  isOnline: boolean
) {
  if (isOnline) {
    try {
      let result;
      if (action === 'open_session') {
        result = await supabase.from(table).insert(payload).select().single();
      } else if (action === 'add_consumption') {
        result = await supabase.from(table).insert(payload).select().single();
      } else if (action === 'close_session') {
        const { id, ...updates } = payload;
        result = await supabase.from(table).update(updates).eq('id', id).select().single();
      }

      if (result?.error) throw result.error;

      // Also update local cache for consistency
      if (action === 'open_session' || action === 'close_session') {
        await db.sessions.put({ ...payload, ...result?.data, synced: true });
      } else if (action === 'add_consumption') {
        await db.session_consumptions.put({ ...payload, ...result?.data, synced: true });
      }

      return { data: result?.data, error: null };
    } catch (error) {
      console.error('Online write failed, falling back to offline mode:', error);
      // Fallback to offline if online write fails
    }
  }

  // Offline Mode or Fallback
  const id = payload.id || crypto.randomUUID();
  const localRecord = { ...payload, id, synced: false };

  if (action === 'open_session' || action === 'close_session') {
    await db.sessions.put(localRecord);
  } else if (action === 'add_consumption') {
    await db.session_consumptions.put(localRecord);
  }

  await enqueueAction(action, localRecord);
  return { data: localRecord, error: null };
}
