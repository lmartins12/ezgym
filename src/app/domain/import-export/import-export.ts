import { inject, Injectable } from '@angular/core';
import { DatabaseService } from '@core/db/database';
import { ExerciseRepository } from '@domain/exercises/exercise.repository';
import type { ExerciseSeedData } from '@domain/exercises/exercise.repository';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import type { Workout } from '@domain/workouts/workout';
import { v4 as uuidv4 } from 'uuid';
import {
  APP_VERSION,
  EXPORT_VERSION,
  ValidationWarningType,
  type ExportData,
  type ExportWorkout,
  type ImportPreview,
  type ImportResult,
  type ValidationWarning,
} from './export-data';

/**
 * Use-case for the versioned workouts interchange format: builds the
 * export JSON from aggregates and imports it back in a single atomic
 * transaction. Browser I/O (clipboard, share/download) lives in
 * @shared; the AI prompt copy lives in the settings feature.
 */
@Injectable({ providedIn: 'root' })
export class ImportExport {
  private readonly database = inject(DatabaseService);
  private readonly exerciseRepository = inject(ExerciseRepository);
  private readonly workoutRepository = inject(WorkoutRepository);

  /**
   * Export all workouts as JSON string
   */
  public async exportWorkouts(): Promise<string> {
    const [workouts, workoutExercises] = await Promise.all([
      this.workoutRepository.getAll(),
      this.workoutRepository.getAllWorkoutExercises(),
    ]);

    const exerciseIds = Array.from(
      new Set(workoutExercises.map((we) => we.exercise_id)),
    );
    const exercises = await this.exerciseRepository.getByIds(exerciseIds);
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    // Group workout exercises by workout_id
    const weByWorkout = new Map<string, typeof workoutExercises>();
    for (const we of workoutExercises) {
      const list = weByWorkout.get(we.workout_id) ?? [];
      list.push(we);
      weByWorkout.set(we.workout_id, list);
    }

    const sortedWorkouts = workouts.sort((a, b) => {
      const orderA = a.order_index ?? 0;
      const orderB = b.order_index ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.created_at ?? 0) - (b.created_at ?? 0);
    });

    const exportWorkouts: ExportWorkout[] = [];

    for (const workout of sortedWorkouts) {
      const weList = weByWorkout.get(workout.id) ?? [];
      weList.sort((a, b) => a.order_index - b.order_index);

      exportWorkouts.push({
        name: workout.name,
        description: workout.description || undefined,
        muscle_group: workout.muscle_group || undefined,
        exercises: weList.map((we) => {
          const ex = exerciseMap.get(we.exercise_id);
          return {
            exercise_name: ex?.name ?? 'Unknown Exercise',
            muscle_group: (ex?.muscle_group ?? 'other') as MuscleGroup,
            equipment: ex?.equipment || undefined,
            notes: ex?.notes || undefined,
            order_index: we.order_index,
            sets: we.sets,
            reps: we.reps,
            rest_seconds: we.rest_seconds,
            target_weight: we.target_weight ?? undefined,
          };
        }),
      });
    }

    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exported_at: Date.now(),
      app_version: APP_VERSION,
      workouts: exportWorkouts,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import workouts from JSON string
   */
  public async importWorkouts(json: string): Promise<ImportResult> {
    try {
      const data: ExportData = JSON.parse(json);
      let exercisesCreated = 0;
      let exercisesReused = 0;
      let workoutsImported = 0;

      // Preload the exercise name map once so lookups are O(1) per exercise
      const knownExercises = await this.exerciseRepository.getNameMap();

      await this.database.write(async () => {
        const existingWorkouts = await this.workoutRepository.getAll();
        let currentMaxOrder = existingWorkouts.reduce(
          (max, w) => Math.max(max, w.order_index ?? 0),
          -1,
        );

        for (const workoutData of data.workouts) {
          currentMaxOrder++;
          const workoutId = uuidv4();
          const now = Date.now();

          const newWorkout: Workout = {
            id: workoutId,
            name: workoutData.name,
            description: workoutData.description || undefined,
            muscle_group: workoutData.muscle_group || undefined,
            order_index: currentMaxOrder,
            created_at: now,
            updated_at: now,
          };

          await this.workoutRepository.add(newWorkout);
          workoutsImported++;

          for (const exerciseData of workoutData.exercises) {
            const seed: ExerciseSeedData = {
              name: exerciseData.exercise_name,
              muscleGroup: exerciseData.muscle_group,
              equipment: exerciseData.equipment,
              notes: exerciseData.notes,
            };
            const { exerciseId, isNew } =
              await this.exerciseRepository.findOrCreate(seed, {
                knownExercises,
              });
            if (isNew) {
              exercisesCreated++;
            } else {
              exercisesReused++;
            }

            const workoutExerciseId = uuidv4();
            await this.workoutRepository.addWorkoutExercise({
              id: workoutExerciseId,
              workout_id: workoutId,
              exercise_id: exerciseId,
              order_index: exerciseData.order_index,
              sets: exerciseData.sets,
              reps: exerciseData.reps,
              rest_seconds: exerciseData.rest_seconds,
              target_weight: exerciseData.target_weight ?? undefined,
            });
          }
        }
      });

      return {
        success: true,
        workoutsImported,
        exercisesCreated,
        exercisesReused,
      };
    } catch (error) {
      return {
        success: false,
        workoutsImported: 0,
        exercisesCreated: 0,
        exercisesReused: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get import preview data
   */
  public async getImportPreview(json: string): Promise<ImportPreview | null> {
    try {
      const data: ExportData = JSON.parse(json);
      const existingExercises =
        await this.exerciseRepository.getExistingNames();
      const newExercisesSet = new Set<string>();
      const existingExercisesSet = new Set<string>();
      const warnings: ValidationWarning[] = [];

      for (const workout of data.workouts) {
        if (workout.exercises.length === 0) {
          warnings.push({
            type: ValidationWarningType.WORKOUT_WITHOUT_EXERCISES,
            workoutIndex: data.workouts.indexOf(workout),
            workoutName: workout.name,
            message: 'WORKOUT_WITHOUT_EXERCISES',
          });
        }

        for (const exercise of workout.exercises) {
          const normalizedName = exercise.exercise_name.toLowerCase();
          if (existingExercises.has(normalizedName)) {
            existingExercisesSet.add(exercise.exercise_name);
          } else {
            newExercisesSet.add(exercise.exercise_name);
          }
        }
      }

      return {
        workoutCount: data.workouts.length,
        newExercises: Array.from(newExercisesSet),
        existingExercises: Array.from(existingExercisesSet),
        warnings,
      };
    } catch (error) {
      console.error('Failed to build import preview:', error);
      return null;
    }
  }
}
