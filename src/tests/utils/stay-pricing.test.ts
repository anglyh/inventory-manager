import { describe, expect, it } from 'vitest';
import { suggestExpectedCheckOut, suggestExtra } from '../../utils/stay-pricing.js';

const expectedOut = new Date('2026-10-13T17:00:00.000Z'); // 12:00 in Lima
const minutesAfter = (minutes: number) => new Date(expectedOut.getTime() + minutes * 60_000);

describe('stay pricing', () => {
  it('suggests no extra within the tolerance', () => {
    expect(suggestExtra({ expectedOut, now: minutesAfter(15), extraHourPrice: 10, toleranceMinutes: 15 }))
      .toEqual({ overdueMinutes: 15, hours: 0, amount: 0 });
  });

  it('charges every started hour once the tolerance is exceeded (1h20 late → 2 hours)', () => {
    expect(suggestExtra({ expectedOut, now: minutesAfter(80), extraHourPrice: 10, toleranceMinutes: 15 }))
      .toEqual({ overdueMinutes: 80, hours: 2, amount: 20 });
  });

  it('expects HOURLY stays after the contracted hours and NIGHT stays the next day at the checkout time', () => {
    const checkIn = new Date('2026-10-13T03:30:00.000Z');
    expect(suggestExpectedCheckOut({ checkIn, rateKind: 'HOURLY', hours: 3, checkoutTime: '12:00' }).toISOString())
      .toBe('2026-10-13T06:30:00.000Z');

    // 22:30 in Lima → next day 12:00 in Lima (17:00 UTC).
    const out = suggestExpectedCheckOut({ checkIn, rateKind: 'NIGHT', checkoutTime: '12:00' });
    expect(out.toISOString()).toBe('2026-10-13T17:00:00.000Z');
    expect(suggestExtra({ expectedOut: out, now: new Date('2026-10-13T18:30:00.000Z'), extraHourPrice: 10, toleranceMinutes: 15 }).hours)
      .toBe(2);
  });
});
