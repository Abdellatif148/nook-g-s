import { supabase } from '../supabase';
import { db } from './db';
import { getPendingActions, removeAction, markActionFailed } from './queue';

export async function runSync() {
  const pending = await getPendingActions();
  if (pending.length === 0) return { success: true, processed: 0 };

  let processedCount = 0;

  for (const item of pending) {
    try {
      let success = false;

      if (item.action === 'open_session') {
        // Check for conflicts: does this client already have an open session in Supabase?
        if (item.payload.client_account_id) {
            const { data: existing } = await supabase
                .from('sessions')
                .select('id')
                .eq('client_account_id', item.payload.client_account_id)
                .eq('status', 'active')
                .single();

            if (existing) {
                // Conflict detected!
                // For now, mark as failed and require manual resolution (Task 1E)
                console.warn('Sync conflict: Client already has an active session in Supabase', item);
                await markActionFailed(item.id!);
                continue;
            }
        }

        const { error } = await supabase.from('sessions').insert(item.payload);
        if (!error) success = true;
      }
      else if (item.action === 'add_consumption') {
        const { error } = await supabase.from('session_consumptions').insert(item.payload);
        if (!error) success = true;
      }
      else if (item.action === 'close_session') {
        const { id, ...updates } = item.payload;
        const { error } = await supabase.from('sessions').update(updates).eq('id', id);
        if (!error) success = true;
      }

      if (success) {
        await removeAction(item.id!);
        // Update local record as synced
        if (item.action === 'open_session' || item.action === 'close_session') {
            await db.sessions.update(item.payload.id, { synced: true });
        } else if (item.action === 'add_consumption') {
            await db.session_consumptions.update(item.payload.id, { synced: true });
        }
        processedCount++;
      } else {
        await markActionFailed(item.id!);
      }
    } catch (err) {
      console.error('Failed to sync item:', item, err);
      await markActionFailed(item.id!);
    }
  }

  return { success: true, processed: processedCount };
}

export async function refreshCaches(cafeId: string) {
    // 1. Pull latest products
    const { data: products } = await supabase.from('products').select('*').eq('cafe_id', cafeId);
    if (products) {
        await db.products.clear();
        await db.products.bulkPut(products.map(p => ({ ...p, cached_at: new Date().toISOString() })));
    }

    // 2. Pull latest clients
    const { data: clients } = await supabase.from('client_accounts').select('*').eq('cafe_id', cafeId);
    if (clients) {
        await db.clients.clear();
        await db.clients.bulkPut(clients.map(c => ({ ...c, cached_at: new Date().toISOString() })));
    }

    // 3. Pull active sessions
    const { data: activeSessions } = await supabase.from('sessions').select('*').eq('cafe_id', cafeId).eq('status', 'active');
    if (activeSessions) {
        // We only overwrite synced sessions. Local unsynced sessions should remain.
        const syncedSessions = await db.sessions.where('synced').equals(1).toArray();
        const syncedIds = syncedSessions.map(s => s.id);
        await db.sessions.bulkDelete(syncedIds);
        await db.sessions.bulkPut(activeSessions.map(s => ({ ...s, synced: true, created_at: s.created_at || new Date().toISOString() })));
    }
}
