import type { EquipmentKind } from '@domain/exercises/exercise-library';
import type { MuscleGroup } from '@domain/shared/muscle-group';

/** Where a picker row comes from (display grouping, not identity). */
export type ExercisePickerSource = 'recent' | 'mine' | 'library';

/**
 * One selectable row of the exercise picker. Identity is carried by
 * `key` — `db:<exercise_id>` for user exercises (a row may appear in
 * both Recentes and Meus) and `lib:<slug>` for library items — so
 * selection state stays consistent across sections.
 */
export interface ExercisePickerOption {
  key: string;
  source: ExercisePickerSource;
  /** Display name in the active language. */
  name: string;
  muscle_group: MuscleGroup;
  /** User exercise id (db rows). */
  exercise_id?: string;
  /** Free-text equipment already stored by the user (db rows). */
  equipment?: string;
  /** Catalog notes of a user exercise (db rows). */
  notes?: string;
  /** Controlled equipment vocabulary of the bundled library. */
  equipment_kind?: EquipmentKind;
  /** Library slug (library rows). */
  slug?: string;
  /** Recents metadata: how many workout_exercises rows use it. */
  use_count?: number;
  /** Recents metadata: latest parent workout touch (ms). */
  last_used_at?: number;
}

/**
 * The three picker lists for a given search term + muscle filter.
 * The library is already deduped against user names (db wins).
 */
export interface ExercisePickerResult {
  recents: ExercisePickerOption[];
  mine: ExercisePickerOption[];
  library: ExercisePickerOption[];
}

/** i18n key of the controlled equipment vocabulary (§7.4). */
export function equipmentKindLabelKey(kind: EquipmentKind): string {
  return `EQUIPMENT.KIND_${kind.toUpperCase()}`;
}
