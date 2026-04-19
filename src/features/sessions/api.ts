import { supabase } from '../../lib/supabase';
import { Session } from '../../types';

export const sessionsApi = {
  async getActive(cafeId: string) {
    return supabase.from('sessions').select('*').eq('cafe_id', cafeId).eq('status', 'active');
  },

  async getById(id: string) {
    return supabase.from('sessions').select('*').eq('id', id).single();
  },

  async getHistory(cafeId: string, limit = 50) {
    return supabase
      .from('sessions')
      .select('*')
      .eq('cafe_id', cafeId)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(limit);
  }
};
