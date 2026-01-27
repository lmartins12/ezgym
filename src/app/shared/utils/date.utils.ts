/**
 * Convert Unix timestamp (ms) to Date object.
 */
export function unixToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Convert Date to Unix timestamp (ms) at start of day.
 */
export function dateToUnixStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Convert Date to Unix timestamp (ms) at end of day.
 */
export function dateToUnixEndOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Get start of month as Unix timestamp.
 */
export function getMonthStart(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.getTime();
}

/**
 * Get end of month as Unix timestamp.
 */
export function getMonthEnd(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return d.getTime();
}

/**
 * Check if two dates are the same day.
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD) in local timezone.
 */
export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format duration in milliseconds to human-readable string.
 */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}min`
    : `${hours}h`;
}
