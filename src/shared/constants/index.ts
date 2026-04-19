export const MAX_SESSION_HOURS = 8;
export const MIN_BILLING_MINUTES = 1;

export const CATEGORIES = {
  DRINK: 'boisson',
  FOOD: 'nourriture',
  OTHER: 'autre'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ACCOUNT: 'account',
  FREE: 'free'
} as const;

export const SESSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;
