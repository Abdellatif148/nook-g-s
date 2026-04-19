import Dexie, { Table } from 'dexie';

export interface LocalSession {
  id: string;
  client_id?: string | null;
  cafe_id: string;
  staff_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  seat_number: number;
  billing_mode: 'time' | 'consumption';
  start_time: string;
  end_time?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  final_amount: number;
  rate: number;
  rate_unit: number; // minutes per billing unit
  synced: boolean;
  provisional_start?: boolean;
  created_at: string;
  notes?: string | null;
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
  action: 'open_session' | 'add_consumption' | 'close_session';
  payload: any;
  status: 'pending' | 'failed';
  retries: number;
  created_at: string;
  last_attempt?: string | null;
}

export class NookDatabase extends Dexie {
  sessions!: Table<LocalSession>;
  session_consumptions!: Table<LocalConsumption>;
  products!: Table<LocalProduct>;
  clients!: Table<LocalClient>;
  outbox!: Table<OutboxItem>;

  constructor() {
    super('NookOfflineDB');
    this.version(1).stores({
      sessions: 'id, client_id, cafe_id, status, synced, created_at',
      session_consumptions: 'id, session_id, synced, created_at',
      products: 'id, cafe_id, category',
      clients: 'id, cafe_id, name, phone',
      outbox: '++id, action, status, created_at'
    });
  }
}

export const db = new NookDatabase();
