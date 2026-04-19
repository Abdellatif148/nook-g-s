/**
 * Billing Engine for Nook OS
 * Handles duration calculation and amount rounding based on venue settings.
 */

export type BillingIncrement = 'minute' | '15min' | '30min' | 'hour';

interface BillingOptions {
  ratePerHour: number;
  increment: BillingIncrement;
  minMinutes?: number;
}

/**
 * Calculates duration in minutes between two dates.
 */
export function calculateDurationMinutes(start: string | Date, end: string | Date): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (isNaN(startTime) || isNaN(endTime)) return 0;

  const diffMs = endTime - startTime;
  // Clamp to 0 to avoid negative durations due to clock skew
  return Math.max(0, Math.floor(diffMs / 60000));
}

/**
 * Calculates the billed amount based on duration and rate.
 * Uses the specified increment (ceiling rounding).
 */
export function calculateBilledAmount(durationMinutes: number, options: BillingOptions): number {
  const { ratePerHour, increment, minMinutes = 1 } = options;

  if (durationMinutes <= 0) return 0;

  // Apply minimum minutes
  const effectiveMinutes = Math.max(durationMinutes, minMinutes);

  let billableMinutes = effectiveMinutes;

  switch (increment) {
    case '15min':
      billableMinutes = Math.ceil(effectiveMinutes / 15) * 15;
      break;
    case '30min':
      billableMinutes = Math.ceil(effectiveMinutes / 30) * 30;
      break;
    case 'hour':
      billableMinutes = Math.ceil(effectiveMinutes / 60) * 60;
      break;
    case 'minute':
    default:
      billableMinutes = effectiveMinutes;
      break;
  }

  const amount = (billableMinutes / 60) * ratePerHour;

  // Round to 2 decimals
  return Math.round(amount * 100) / 100;
}

/**
 * Checks if a session is considered "long" based on venue settings.
 */
export function isLongSession(durationMinutes: number, alertHours: number): boolean {
  return durationMinutes / 60 >= alertHours;
}

/**
 * Formats duration as HH:MM:SS
 */
export function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}
