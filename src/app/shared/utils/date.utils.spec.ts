import {
  dateToUnixEndOfDay,
  dateToUnixStartOfDay,
  formatDuration,
  getMonthEnd,
  getMonthStart,
  isSameDay,
  isToday,
  toIsoDateString,
  unixToDate,
} from './date.utils';

describe('date.utils', () => {
  describe('unixToDate', () => {
    it('converts a unix timestamp to a Date', () => {
      const result = unixToDate(1704067200000);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(1704067200000);
    });
  });

  describe('dateToUnixStartOfDay', () => {
    it('returns the timestamp at 00:00:00.000 local time', () => {
      const date = new Date(2026, 6, 15, 14, 30, 45, 123);
      const result = dateToUnixStartOfDay(date);
      expect(result).toBe(new Date(2026, 6, 15, 0, 0, 0, 0).getTime());
    });
  });

  describe('dateToUnixEndOfDay', () => {
    it('returns the timestamp at 23:59:59.999 local time', () => {
      const date = new Date(2026, 6, 15, 8, 0, 0, 0);
      const result = dateToUnixEndOfDay(date);
      expect(result).toBe(new Date(2026, 6, 15, 23, 59, 59, 999).getTime());
    });
  });

  describe('getMonthStart / getMonthEnd', () => {
    it('start of month is the 1st at midnight', () => {
      const result = getMonthStart(new Date(2026, 6, 15));
      expect(result).toBe(new Date(2026, 6, 1).getTime());
    });

    it('end of month is the last day at 23:59:59.999', () => {
      const result = getMonthEnd(new Date(2026, 6, 15));
      expect(result).toBe(new Date(2026, 6, 31, 23, 59, 59, 999).getTime());
    });

    it('handles February of a leap year', () => {
      const result = getMonthEnd(new Date(2028, 1, 10));
      expect(result).toBe(new Date(2028, 1, 29, 23, 59, 59, 999).getTime());
    });
  });

  describe('isSameDay', () => {
    it('is true for the same calendar day', () => {
      expect(
        isSameDay(new Date(2026, 6, 15, 8, 0), new Date(2026, 6, 15, 22, 0)),
      ).toBe(true);
    });

    it('is false for different days', () => {
      expect(isSameDay(new Date(2026, 6, 15), new Date(2026, 6, 16))).toBe(
        false,
      );
    });

    it('is false for same day/month but different year', () => {
      expect(isSameDay(new Date(2025, 6, 15), new Date(2026, 6, 15))).toBe(
        false,
      );
    });
  });

  describe('isToday', () => {
    it('is true for the current day', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('is false for another day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('toIsoDateString', () => {
    it('formats with zero padding', () => {
      expect(toIsoDateString(new Date(2026, 2, 5))).toBe('2026-03-05');
    });

    it('formats a two-digit day and month', () => {
      expect(toIsoDateString(new Date(2026, 11, 25))).toBe('2026-12-25');
    });
  });

  describe('formatDuration', () => {
    it('formats values under one hour in minutes', () => {
      expect(formatDuration(30 * 60000)).toBe('30 min');
    });

    it('rounds to the nearest minute', () => {
      expect(formatDuration(30 * 60000 + 29999)).toBe('30 min');
      expect(formatDuration(30 * 60000 + 30000)).toBe('31 min');
    });

    it('formats hours and remaining minutes', () => {
      expect(formatDuration(95 * 60000)).toBe('1h 35min');
    });

    it('formats whole hours without minutes', () => {
      expect(formatDuration(120 * 60000)).toBe('2h');
    });
  });
});
