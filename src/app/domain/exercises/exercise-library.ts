import { z } from 'zod';
import { MUSCLE_GROUPS, type MuscleGroup } from '../shared/muscle-group';

/**
 * Controlled equipment vocabulary of the bundled library (§7.4). On
 * materialization the i18n-translated label is stored in the user's
 * free-text `exercises.equipment` field, keeping the schema intact.
 */
export type EquipmentKind =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'cardio'
  | 'other';

export const EQUIPMENT_KINDS: readonly EquipmentKind[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'cardio',
  'other',
];

/**
 * Read-only exercise of the bundled bilingual library. App content
 * (like the muscle SVGs), never user data: selecting an entry
 * materializes a regular `Exercise` through the repository, so this
 * module must never touch IndexedDB.
 */
export interface LibraryExercise {
  /** Stable curated id (dedupe/diagnostic key), e.g. "supino-reto". */
  slug: string;
  /** Canonical name per language. */
  name: { pt: string; en: string };
  muscle_group: MuscleGroup;
  equipment: EquipmentKind;
  /** Search synonyms covering abbreviations and regional variants. */
  aliases?: { pt?: string[]; en?: string[] };
}

const muscleGroupSchema: z.ZodType<MuscleGroup> = z.enum(
  MUSCLE_GROUPS as [MuscleGroup, ...MuscleGroup[]],
);

const equipmentKindSchema: z.ZodType<EquipmentKind> = z.enum(
  EQUIPMENT_KINDS as [EquipmentKind, ...EquipmentKind[]],
);

const libraryAliasesSchema = z.strictObject({
  pt: z.array(z.string().min(1)).optional(),
  en: z.array(z.string().min(1)).optional(),
});

/**
 * Validates one curated entry. Strict on purpose: a typo'd key in the
 * content asset fails fast instead of being silently dropped.
 */
export const libraryExerciseSchema: z.ZodType<LibraryExercise> = z.strictObject(
  {
    slug: z.string().min(1),
    name: z.strictObject({ pt: z.string().min(1), en: z.string().min(1) }),
    muscle_group: muscleGroupSchema,
    equipment: equipmentKindSchema,
    aliases: libraryAliasesSchema.optional(),
  },
);

const librarySchema = z.array(libraryExerciseSchema).min(1);

let cache: readonly LibraryExercise[] | null = null;

/**
 * Loads the bundled bilingual library, lazily on first call, and caches
 * it in memory for subsequent calls. Throws (Zod) if the shipped asset
 * is malformed — integrity is enforced at runtime, not only in specs.
 */
export async function loadExerciseLibrary(): Promise<
  readonly LibraryExercise[]
> {
  if (cache) return cache;
  const asset = await import('../../../assets/library/exercises.json');
  const library = librarySchema.parse(asset.default);
  cache = Object.freeze(library);
  return cache;
}
