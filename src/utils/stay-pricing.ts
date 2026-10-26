/**
 * Pure stay pricing rules. Lima has no daylight saving time, so its fixed UTC−5 offset is exact.
 */
const LIMA_OFFSET_MS = 5 * 3_600_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * A NIGHT check-in before this Lima hour belongs to the night that is ending: the guest who arrives
 * at 03:00 leaves the same day at the checkout time, not the next one.
 */
export const EARLY_MORNING_HOUR = 6;

export type RateKind = 'HOURLY' | 'NIGHT';

/** Parses "HH:MM" or "HH:MM:SS" (PostgreSQL time) into minutes since midnight. */
const minutesOfDay = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Suggested expected check-out.
 * - HOURLY: check-in + the contracted hours.
 * - NIGHT: next day at checkoutTime (Lima). Early-morning check-ins (before EARLY_MORNING_HOUR and
 *   before checkoutTime) leave the same day at checkoutTime. `hours` is ignored.
 */
export function suggestExpectedCheckOut(params: {
  checkIn: Date;
  rateKind: RateKind;
  hours?: number | null;
  checkoutTime: string;
}): Date {
  const { checkIn, rateKind, hours, checkoutTime } = params;
  if (rateKind === 'HOURLY') return new Date(checkIn.getTime() + (hours ?? 1) * HOUR_MS);

  // Lima wall-clock time expressed as UTC fields.
  const local = new Date(checkIn.getTime() - LIMA_OFFSET_MS);
  const localMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const checkInMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const checkoutMinutes = minutesOfDay(checkoutTime);
  const sameDay = local.getUTCHours() < EARLY_MORNING_HOUR && checkInMinutes < checkoutMinutes;

  return new Date(localMidnight + (sameDay ? 0 : DAY_MS) + checkoutMinutes * MINUTE_MS + LIMA_OFFSET_MS);
}

export interface SuggestedExtra {
  /** Whole minutes past the expected check-out (0 if not overdue). */
  overdueMinutes: number;
  /** Hours to charge: 0 within the tolerance, otherwise every started hour counts as a full hour. */
  hours: number;
  amount: number;
}

/**
 * Suggested extra charge for a late check-out. The tolerance is a grace period: once it is exceeded,
 * the whole overdue time is charged (1h20 late with 15 min of tolerance → 2 hours).
 */
export function suggestExtra(params: {
  expectedOut: Date;
  now: Date;
  extraHourPrice: number;
  toleranceMinutes: number;
}): SuggestedExtra {
  const { expectedOut, now, extraHourPrice, toleranceMinutes } = params;
  const overdueMinutes = Math.max(0, Math.floor((now.getTime() - expectedOut.getTime()) / MINUTE_MS));
  if (overdueMinutes <= toleranceMinutes) return { overdueMinutes, hours: 0, amount: 0 };

  const hours = Math.ceil(overdueMinutes / 60);
  return { overdueMinutes, hours, amount: Math.round(hours * extraHourPrice * 100) / 100 };
}
