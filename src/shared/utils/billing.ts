export interface BillingResult {
  durationMinutes: number;
  amount: number;
  billedUnits: number;
}

export const calculateBilling = (
  startedAt: string,
  endedAt: string | null,
  rate: number,
  rateUnitMinutes: number = 60
): BillingResult => {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();

  if (isNaN(start)) return { durationMinutes: 0, amount: 0, billedUnits: 0 };

  const durationSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const durationMinutes = durationSeconds / 60;
  const billedUnits = durationMinutes / rateUnitMinutes;
  const amount = Math.max(0, Math.round(billedUnits * rate * 100) / 100);

  return {
    durationMinutes: Math.floor(durationMinutes),
    amount,
    billedUnits
  };
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};
