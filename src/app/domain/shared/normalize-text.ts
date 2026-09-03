/**
 * Normalizes free text for comparison and search: trims, lowercases and
 * strips diacritics, so "Tríceps", "  tríceps " and "triceps" are equal.
 * Single algorithm shared by the exercise catalog (dedupe) and the
 * library picker (bilingual search).
 */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
