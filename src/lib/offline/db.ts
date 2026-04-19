import Dexie from 'dexie';

export interface LocalSession {
  id: string;
  cafe_id: string;
  client_account_id?: string | null;
  billing_mode: 'time' | 'consumption';
  started_at: string;
  ended_at?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  total_amount: number;
  rate?: number | null;
  rate_unit?: number | null;
  synced: boolean;
  created_at: string;
  provisional_start?: boolean;
}

export interface LocalConsumption {
  id: string;
  session_id: string;
  product_id?: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  synced: boolean;
  created_at: string;
}

export interface LocalProduct {
  id: string;
  cafe_id: string;
  name: string;
  price: number;
  category: string;
  cached_at: string;
}

export interface LocalClient {
  id: string;
  cafe_id: string;
  name: string;
  phone?: string | null;
  cached_at: string;
}

export interface OutboxItem {
  id?: number;
  action: 'open_session' | 'add_consumption' | 'close_session' | 'update_session';
  payload: any;
  status: 'pending' | 'failed' | 'conflict';
  retries: number;
  created_at: string;
  last_attempt?: string;
}

class NookDatabase extends Dexie {
  sessions!: Dexie.Table<LocalSession, string>;
  session_consumptions!: Dexie.Table<LocalConsumption, string>;
  products!: Dexie.Table<LocalProduct, string>;
  clients!: Dexie.Table<LocalClient, string>;
  outbox!: Dexie.Table<OutboxItem, number>;

  constructor() {
    super('NookOfflineDB');
    this.version(2).stores({
      sessions: 'id, cafe_id, client_account_id, status, synced',
      session_consumptions: 'id, session_id, synced',
      products: 'id, cafe_id',
      clients: 'id, cafe_id, phone',
      outbox: '++id, action, status, created_at'
    });
  }
}

export const db = new NookDatabase();
