import { db, type OutboxItem } from './db';

export const enqueue = async (action: OutboxItem['action'], payload: any) => {
  await db.outbox.add({
    action,
    payload,
    status: 'pending',
    retries: 0,
    created_at: new Date().toISOString()
  });
};

export const dequeue = async (id: number) => {
  await db.outbox.delete(id);
};

export const markFailed = async (id: number) => {
  const item = await db.outbox.get(id);
  if (item) {
    await db.outbox.update(id, {
      status: 'failed',
      retries: (item.retries || 0) + 1,
      last_attempt: new Date().toISOString()
    });
  }
};
