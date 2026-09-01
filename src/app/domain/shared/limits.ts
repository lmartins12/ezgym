export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

export const NAME_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 280;
export const NOTES_MAX_LENGTH = 500;
export const EQUIPMENT_MAX_LENGTH = 120;

export const REPS_MAX_LENGTH = 7;
export const REPS_PATTERN = /^\d+(-\d+)?$/;

export const SETS_RANGE: NumericRange = { min: 1, max: 20 };
export const REST_SECONDS_RANGE: NumericRange = { min: 0, max: 600 };
export const WEIGHT_RANGE: NumericRange = { min: 0, max: 1000 };
export const LOG_REPS_RANGE: NumericRange = { min: 1, max: 999 };
export const RPE_RANGE: NumericRange = { min: 1, max: 10 };

export function clampToRange(
  value: number,
  range: NumericRange,
  fallback: number = range.min,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, range.min), range.max);
}

export function isValidRepsFormat(reps: string): boolean {
  return REPS_PATTERN.test(reps);
}
