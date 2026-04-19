import { db } from './db';
import { supabase } from '../supabase';
import { useConnectivityStore } from '../../stores/connectivityStore';

export const processSyncQueue = async () => {
  const store = useConnectivityStore.getState();
  if (!store.isOnline || store.syncStatus === 'syncing') return;

  const pendingItems = await db.outbox
    .where('status')
    .equals('pending')
    .sortBy('created_at');

  if (pendingItems.length === 0) return;

  store.setSyncStatus('syncing');

  for (const item of pendingItems) {
    if (item.retries >= 3) {
       await db.outbox.update(item.id!, { status: 'failed' });
       continue;
    }

    try {
      let success = false;
      // Task 1E: Conflict Resolution Check
      if (item.action === 'open_session') {
        const { data: existing } = await supabase
          .from('sessions')
          .select('id')
          .eq('client_account_id', item.payload.client_account_id)
          .eq('status', 'active')
          .single();

        if (existing) {
          console.warn('Conflict detected for client:', item.payload.client_account_id);
          await db.outbox.update(item.id!, { status: 'failed' });
          continue; // Wait for admin resolution (manual in this simple mock)
        }
      }

      switch (item.action) {
        case 'open_session':
          const { error: openErr } = await supabase.from('sessions').insert(item.payload);
          if (!openErr) success = true;
          break;
        case 'add_consumption':
          const { error: consErr } = await supabase.from('session_consumptions').insert(item.payload);
          if (!consErr) success = true;
          break;
        case 'close_session':
        case 'update_session':
          const { error: upErr } = await supabase.from('sessions').update(item.payload).eq('id', item.payload.id);
          if (!upErr) success = true;
          break;
      }

      if (success) {
        await db.outbox.delete(item.id!);
        if (['open_session', 'close_session', 'update_session'].includes(item.action)) {
           await db.sessions.update(item.payload.id, { synced: true });
        }
      } else {
        await db.outbox.update(item.id!, {
          retries: item.retries + 1,
          last_attempt: new Date().toISOString()
        });
      }
    } catch (err) {
      await db.outbox.update(item.id!, {
        retries: item.retries + 1,
        last_attempt: new Date().toISOString()
      });
    }
  }

  store.setSyncStatus('idle');
  store.setLastSyncAt(new Date());
};
