import { describe, expect, it } from 'vitest';
import { formatStatNumber } from './number.utils';

describe('formatStatNumber', () => {
  it('returns 0 for nullish or non-finite values', () => {
    expect(formatStatNumber(null)).toBe('0');
    expect(formatStatNumber(undefined)).toBe('0');
    expect(formatStatNumber(NaN)).toBe('0');
    expect(formatStatNumber(Infinity)).toBe('0');
  });

  it('formats integers per locale', () => {
    expect(formatStatNumber(1234, 'en-US')).toBe('1,234');
    expect(formatStatNumber(1234, 'pt-BR')).toBe('1.234');
  });

  it('respects maximumFractionDigits', () => {
    expect(formatStatNumber(12.345, 'en-US', 2)).toBe('12.35');
    expect(formatStatNumber(12.3, 'en-US')).toBe('12');
  });

  it('clamps values beyond the display range', () => {
    expect(formatStatNumber(99_999_999, 'en-US')).toBe('9,999,999');
    expect(formatStatNumber(-99_999_999, 'en-US')).toBe('-9,999,999');
  });
});
