import { inject, Injectable } from '@angular/core';
import type { Language } from '@core/i18n/language';
import { loadExerciseLibrary } from '@domain/exercises/exercise-library';
import { ExerciseRepository } from '@domain/exercises/exercise.repository';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import { normalizeText } from '@domain/shared/normalize-text';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import type {
  ExercisePickerOption,
  ExercisePickerResult,
} from '../models/exercise-picker.models';

const RECENTS_LIMIT = 5;

/**
 * Read-model for the exercise picker: merges the read-only bundled
 * library with the user's own catalog and usage history. Pure queries —
 * the modal owns the search/filter UI state and passes the active
 * language. Never writes: materialization of a picked library item
 * happens in the facade via findOrCreate.
 */
@Injectable({ providedIn: 'root' })
export class ExercisePickerQuery {
  private readonly exerciseRepository = inject(ExerciseRepository);
  private readonly workoutRepository = inject(WorkoutRepository);

  public async build(
    searchTerm: string,
    muscleFilter: MuscleGroup | null,
    lang: Language,
  ): Promise<ExercisePickerResult> {
    const otherLang: Language = lang === 'pt' ? 'en' : 'pt';
    const term = normalizeText(searchTerm);

    const [exercises, workoutExercises] = await Promise.all([
      this.exerciseRepository.listAll(),
      this.workoutRepository.getAllWorkoutExercises(),
    ]);

    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
    const dbNames = new Set(exercises.map((e) => normalizeText(e.name)));

    const matchesTerm = (haystacks: string[]): boolean =>
      term === '' || haystacks.some((h) => normalizeText(h).includes(term));
    const matchesFilter = (muscleGroup: MuscleGroup): boolean =>
      muscleFilter === null || muscleGroup === muscleFilter;
    const byName = (a: { name: string }, b: { name: string }): number =>
      a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' });

    // --- Recentes: usage frequency, recency as tiebreaker ---
    const usage = new Map<string, { count: number; workoutIds: Set<string> }>();
    for (const we of workoutExercises) {
      const entry = usage.get(we.exercise_id) ?? {
        count: 0,
        workoutIds: new Set<string>(),
      };
      entry.count += 1;
      entry.workoutIds.add(we.workout_id);
      usage.set(we.exercise_id, entry);
    }
    const usedWorkoutIds = new Set(workoutExercises.map((we) => we.workout_id));
    const usedWorkouts = await this.workoutRepository.getByIds([
      ...usedWorkoutIds,
    ]);
    const workoutTouch = new Map(usedWorkouts.map((w) => [w.id, w.updated_at]));

    const recents: ExercisePickerOption[] = [];
    for (const [exerciseId, entry] of usage) {
      const exercise = exerciseMap.get(exerciseId);
      if (!exercise) continue; // orphan junction row, nothing to show
      if (!matchesTerm([exercise.name])) continue;
      if (!matchesFilter(exercise.muscle_group)) continue;
      const lastUsedAt = Math.max(
        0,
        ...[...entry.workoutIds].map((id) => workoutTouch.get(id) ?? 0),
      );
      recents.push({
        key: `db:${exercise.id}`,
        source: 'recent',
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        exercise_id: exercise.id,
        equipment: exercise.equipment,
        notes: exercise.notes,
        use_count: entry.count,
        last_used_at: lastUsedAt,
      });
    }
    recents.sort(
      (a, b) =>
        (b.use_count ?? 0) - (a.use_count ?? 0) ||
        (b.last_used_at ?? 0) - (a.last_used_at ?? 0) ||
        byName(a, b),
    );

    // --- Meus exercícios: the full user catalog, alphabetical ---
    const mine: ExercisePickerOption[] = exercises
      .filter((e) => matchesTerm([e.name]) && matchesFilter(e.muscle_group))
      .map((e) => ({
        key: `db:${e.id}`,
        source: 'mine' as const,
        name: e.name,
        muscle_group: e.muscle_group,
        exercise_id: e.id,
        equipment: e.equipment,
        notes: e.notes,
      }))
      .sort(byName);

    // --- Biblioteca: bundled asset, deduped by name against the DB ---
    const library = await loadExerciseLibrary();
    const libraryOptions: ExercisePickerOption[] = [];
    for (const item of library) {
      if (!matchesFilter(item.muscle_group)) continue;
      if (
        !matchesTerm([
          item.name[lang],
          item.name[otherLang],
          ...(item.aliases?.pt ?? []),
          ...(item.aliases?.en ?? []),
        ])
      ) {
        continue;
      }
      // User names win over builtins — in either language, so an
      // exercise materialized before a language switch is not offered
      // again as a near-duplicate.
      if (
        dbNames.has(normalizeText(item.name[lang])) ||
        dbNames.has(normalizeText(item.name[otherLang]))
      ) {
        continue;
      }
      libraryOptions.push({
        key: `lib:${item.slug}`,
        source: 'library',
        name: item.name[lang],
        muscle_group: item.muscle_group,
        equipment_kind: item.equipment,
        slug: item.slug,
      });
    }
    libraryOptions.sort(byName);

    return {
      recents: recents.slice(0, RECENTS_LIMIT),
      mine,
      library: libraryOptions,
    };
  }
}
