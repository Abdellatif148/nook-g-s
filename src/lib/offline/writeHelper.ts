import { supabase } from '../supabase';
import { db } from './db';
import { enqueue } from './queue';
import { useConnectivityStore } from '../../stores/connectivityStore';

export const smartWrite = async (
  table: 'sessions' | 'session_consumptions',
  action: 'open_session' | 'add_consumption' | 'close_session' | 'update_session',
  payload: any,
  optimisticData?: any
) => {
  const isOnline = useConnectivityStore.getState().isOnline;
  const localData = optimisticData || payload;

  if (table === 'sessions') {
    await db.sessions.put({
      ...localData,
      synced: false,
      created_at: localData.created_at || new Date().toISOString()
    });
  } else if (table === 'session_consumptions') {
    await db.session_consumptions.put({
      ...localData,
      synced: false,
      created_at: localData.created_at || new Date().toISOString()
    });
  }

  if (isOnline) {
    try {
      let error;
      if (action === 'open_session') {
        ({ error } = await supabase.from('sessions').insert(payload));
      } else if (action === 'add_consumption') {
        ({ error } = await supabase.from('session_consumptions').insert(payload));
      } else if (action === 'close_session' || action === 'update_session') {
        ({ error } = await supabase.from('sessions').update(payload).eq('id', payload.id));
      }

      if (!error) {
        if (table === 'sessions') {
          await db.sessions.update(payload.id, { synced: true });
        } else {
          await db.session_consumptions.update(payload.id, { synced: true });
        }
        return localData;
      }
    } catch (e) {}
  }

  await enqueue(action, payload);
  return localData;
};
