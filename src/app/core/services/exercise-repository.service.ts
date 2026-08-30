import { inject, Injectable } from '@angular/core';
import type { Exercise, WorkoutExercise } from '@core/models/app-models';
import { DatabaseService } from '@core/services/database.service';
import { v4 as uuidv4 } from 'uuid';

export interface ExerciseSeedData {
  name: string;
  muscleGroup?: Exercise['muscle_group'];
  equipment?: string;
  notes?: string;
}

export interface FindOrCreateOptions {
  /**
   * When true, the stored exercise metadata (muscle group, equipment,
   * notes) is replaced by the provided data. Used by the manual "add
   * exercise" flow. Import flows keep existing metadata.
   */
  overwriteMetadata?: boolean;
  /**
   * Optional preloaded map of normalized exercise name -> Exercise.
   * When provided, lookups are O(1) and newly created exercises are
   * added to the map, keeping it consistent across a batch import.
   */
  knownExercises?: Map<string, Exercise>;
}

/**
 * Canonical data access for exercises: the single place that resolves
 * exercises by name, creates them, and produces workout-exercise rows
 * enriched with exercise data.
 */
@Injectable({ providedIn: 'root' })
export class ExerciseRepository {
  private readonly dbService = inject(DatabaseService);

  /**
   * Workout exercises joined with their exercise data, sorted by order.
   */
  public async getDetailedByWorkoutId(
    workoutId: string,
  ): Promise<WorkoutExercise[]> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const workoutExercises = await db.workout_exercises
      .where('workout_id')
      .equals(workoutId)
      .toArray();

    if (workoutExercises.length === 0) return [];

    const exerciseIds = workoutExercises.map((we) => we.exercise_id);
    const exercises = await db.exercises
      .where('id')
      .anyOf(exerciseIds)
      .toArray();
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    return workoutExercises
      .map((we) => {
        const ex = exerciseMap.get(we.exercise_id);
        return {
          ...we,
          exercise_name: ex?.name,
          muscle_group: ex?.muscle_group,
          equipment: ex?.equipment,
        };
      })
      .sort((a, b) => a.order_index - b.order_index);
  }

  /**
   * Map of trimmed+lowercased exercise name -> Exercise.
   */
  public async getExerciseNameMap(): Promise<Map<string, Exercise>> {
    await this.dbService.initialize();
    const exercises = await this.dbService.db.exercises.toArray();
    return new Map(exercises.map((e) => [e.name.trim().toLowerCase(), e]));
  }

  /**
   * Set of trimmed+lowercased exercise names.
   */
  public async getExistingNames(): Promise<Set<string>> {
    await this.dbService.initialize();
    const names = await this.dbService.db.exercises.orderBy('name').keys();
    return new Set(
      names
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim().toLowerCase()),
    );
  }

  /**
   * Find an exercise by (case-insensitive) name or create it.
   */
  public async findOrCreate(
    data: ExerciseSeedData,
    options: FindOrCreateOptions = {},
  ): Promise<{ exerciseId: string; isNew: boolean }> {
    await this.dbService.initialize();
    const db = this.dbService.db;
    const normalizedName = data.name.trim().toLowerCase();

    let existing: Exercise | undefined;
    if (options.knownExercises) {
      existing = options.knownExercises.get(normalizedName);
    } else {
      const all = await db.exercises.toArray();
      existing = all.find(
        (e) => e.name.trim().toLowerCase() === normalizedName,
      );
    }

    const now = Date.now();

    if (existing) {
      if (options.overwriteMetadata) {
        await db.exercises.update(existing.id, {
          muscle_group: data.muscleGroup,
          equipment: data.equipment || undefined,
          notes: data.notes || undefined,
          updated_at: now,
        });
      }
      return { exerciseId: existing.id, isNew: false };
    }

    const id = uuidv4();
    const newExercise: Exercise = {
      id,
      name: data.name.trim(),
      muscle_group: data.muscleGroup ?? 'other',
      equipment: data.equipment || undefined,
      notes: data.notes || undefined,
      created_at: now,
      updated_at: now,
    };

    await db.exercises.add(newExercise);
    options.knownExercises?.set(normalizedName, newExercise);

    return { exerciseId: id, isNew: true };
  }
}
