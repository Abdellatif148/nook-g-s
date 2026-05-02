import Dexie, { EntityTable } from 'dexie';
import { Product, ClientAccount, Staff, Session } from '../types';

export const db = new Dexie('NookOSDatabase') as Dexie & {
  products: EntityTable<Product, 'id'>;
  clients: EntityTable<ClientAccount, 'id'>;
  staff: EntityTable<Staff, 'id'>;
  sessions: EntityTable<Session, 'id'>;
};

db.version(1).stores({
  products: 'id, cafe_id, category, sort_order',
  clients: 'id, cafe_id, name, phone',
  staff: 'id, cafe_id, name, active',
  sessions: 'id, cafe_id, status, started_at, ended_at'
});
