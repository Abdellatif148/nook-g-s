/**
 * Smart write helper — routes writes based on connectivity.
 * Online  → execute directly against Supabase.
 * Offline → persist to IndexedDB outbox for later sync.
 *
 * USAGE:
 *   await smartWrite(isOnline, {
 *     action: 'start_session',
 *     payload: { ... },
 *     onlineExecutor: () => startSession({ ... }),
 *   })
 */
import { enqueue } from './queue'
import type { OutboxActionType } from './db'

export interface WriteHelperOptions {
  /** The outbox action type used when offline. */
  action: OutboxActionType
  /** The payload stored in the outbox for later replay. */
  payload: Record<string, unknown>
  /** Called immediately when online — should call the Supabase service function. */
  onlineExecutor: () => Promise<void>
}

/**
 * Execute a write either directly (online) or via the outbox queue (offline).
 * Throws if the online executor throws — the caller is responsible for catching.
 */
export async function smartWrite(
  isOnline: boolean,
  { action, payload, onlineExecutor }: WriteHelperOptions
): Promise<void> {
  if (isOnline) {
    await onlineExecutor()
  } else {
    await enqueue(action, payload)
  }
}
