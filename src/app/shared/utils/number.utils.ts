const MAX_DISPLAY_VALUE = 9_999_999;

export function formatStatNumber(
  value: number | null | undefined,
  locale?: string,
  maximumFractionDigits = 0,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0';
  }
  const clamped = Math.max(
    -MAX_DISPLAY_VALUE,
    Math.min(MAX_DISPLAY_VALUE, value),
  );
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(clamped);
}
