import { db, OutboxItem } from './db';

/**
 * Enqueue a new action to the outbox.
 */
export async function enqueueAction(action: OutboxItem['action'], payload: any) {
  const item: OutboxItem = {
    action,
    payload,
    status: 'pending',
    retries: 0,
    created_at: new Date().toISOString()
  };
  return await db.outbox.add(item);
}

/**
 * Get all pending items ordered by creation time.
 */
export async function getPendingActions() {
  return await db.outbox
    .where('status')
    .equals('pending')
    .sortBy('created_at');
}

/**
 * Mark an item as failed or increment retries.
 */
export async function markActionFailed(id: number) {
  const item = await db.outbox.get(id);
  if (!item) return;

  const newRetries = item.retries + 1;
  await db.outbox.update(id, {
    retries: newRetries,
    status: newRetries >= 3 ? 'failed' : 'pending',
    last_attempt: new Date().toISOString()
  });
}

/**
 * Remove an item from the outbox after successful sync.
 */
export async function removeAction(id: number) {
  await db.outbox.delete(id);
}
