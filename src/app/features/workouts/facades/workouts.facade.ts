import { inject, Injectable } from '@angular/core';
import { ExerciseRepository } from '@domain/exercises/exercise.repository';
import type { ExerciseSeedData } from '@domain/exercises/exercise.repository';
import { DatabaseService } from '@core/db/database';
import { SessionRepository } from '@domain/sessions/session.repository';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import {
  REST_SECONDS_RANGE,
  SETS_RANGE,
  WEIGHT_RANGE,
  clampToRange,
} from '@domain/shared/limits';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import type { Workout } from '@domain/workouts/workout';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutsQuery } from '../queries/workouts.query';
import type {
  AddExerciseData,
  UpdateExerciseData,
  WorkoutDetail,
} from '../models/workout-detail.models';

/**
 * Single API for the workouts screens. Coordinates the workout,
 * exercise and session repositories; pages never touch persistence.
 * Reads delegate to WorkoutsQuery; writes live here.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutsFacade {
  private readonly workoutRepository = inject(WorkoutRepository);
  private readonly exerciseRepository = inject(ExerciseRepository);
  private readonly sessionRepository = inject(SessionRepository);
  private readonly database = inject(DatabaseService);
  private readonly workoutsQuery = inject(WorkoutsQuery);

  // --- Workouts ---

  public async list(): Promise<WorkoutDetail[]> {
    return this.workoutsQuery.list();
  }

  public async getById(id: string): Promise<Workout | null> {
    return this.workoutRepository.getById(id);
  }

  public async create(
    name: string,
    description?: string,
    muscleGroup?: MuscleGroup,
  ): Promise<string> {
    const maxOrder = await this.workoutRepository.getMaxOrderIndex();
    const id = uuidv4();
    const now = Date.now();

    const newWorkout: Workout = {
      id,
      name,
      description: description || undefined,
      muscle_group: muscleGroup || undefined,
      order_index: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    await this.workoutRepository.add(newWorkout);
    return id;
  }

  public async update(
    id: string,
    name: string,
    description?: string,
    muscleGroup?: MuscleGroup,
  ): Promise<void> {
    await this.workoutRepository.update(id, {
      name,
      description: description || undefined,
      muscle_group: muscleGroup || undefined,
      updated_at: Date.now(),
    });
  }

  /**
   * Cascade delete: sessions + set logs, workout exercises, workout.
   */
  public async delete(id: string): Promise<void> {
    await this.database.write(async () => {
      await this.sessionRepository.deleteByWorkoutId(id);
      await this.workoutRepository.deleteWorkoutExercises(id);
      await this.workoutRepository.delete(id);
    });
  }

  public async reorderWorkouts(workoutIds: string[]): Promise<void> {
    await this.workoutRepository.reorder(workoutIds);
  }

  // --- Workout exercises ---

  public async getExercises(workoutId: string): Promise<WorkoutExercise[]> {
    return this.workoutRepository.getDetailedWorkoutExercises(workoutId);
  }

  public async addExercise(data: AddExerciseData): Promise<string> {
    return this.database.write(() => this.persistExercise(data));
  }

  /**
   * Adds several exercises atomically: either every junction row (and
   * its catalog materialization) is persisted, or nothing is.
   */
  public async addExercises(exercises: AddExerciseData[]): Promise<void> {
    if (exercises.length === 0) return;
    await this.database.write(async () => {
      for (const data of exercises) {
        await this.persistExercise(data);
      }
    });
  }

  private async persistExercise(data: AddExerciseData): Promise<string> {
    // Create-or-find exercise by name; manual edits update metadata
    const seed: ExerciseSeedData = {
      name: data.name,
      muscleGroup: data.muscleGroup,
      equipment: data.equipment,
      notes: data.notes,
    };
    const { exerciseId } = await this.exerciseRepository.findOrCreate(seed, {
      overwriteMetadata: true,
    });

    const maxOrder =
      await this.workoutRepository.getWorkoutExerciseMaxOrderIndex(
        data.workoutId,
      );
    const orderIndex = maxOrder + 1;

    const id = uuidv4();
    const newWorkoutExercise: WorkoutExercise = {
      id,
      workout_id: data.workoutId,
      exercise_id: exerciseId,
      order_index: orderIndex,
      sets: clampToRange(Number(data.sets), SETS_RANGE),
      reps: data.reps,
      rest_seconds: clampToRange(Number(data.restSeconds), REST_SECONDS_RANGE),
      target_weight:
        data.targetWeight === undefined || data.targetWeight === null
          ? undefined
          : clampToRange(Number(data.targetWeight), WEIGHT_RANGE),
    };

    await this.workoutRepository.addWorkoutExercise(newWorkoutExercise);
    return id;
  }

  public async updateExercise(
    id: string,
    data: UpdateExerciseData,
  ): Promise<void> {
    await this.database.write(async () => {
      const row = await this.workoutRepository.getWorkoutExercise(id);
      if (!row) return;

      await this.workoutRepository.updateWorkoutExercise(id, {
        sets: clampToRange(Number(data.sets), SETS_RANGE),
        reps: data.reps,
        rest_seconds: clampToRange(
          Number(data.restSeconds),
          REST_SECONDS_RANGE,
        ),
        target_weight:
          data.targetWeight === undefined || data.targetWeight === null
            ? undefined
            : clampToRange(Number(data.targetWeight), WEIGHT_RANGE),
      });

      // Manual edits keep the canonical catalog entry in sync — same
      // metadata semantics as addExercise (overwriteMetadata). Updated
      // by id (not name) so partial edits never create duplicates; the
      // metadata is shared by every workout referencing the exercise.
      await this.exerciseRepository.update(row.exercise_id, {
        name: data.name.trim(),
        muscle_group: data.muscleGroup,
        equipment: data.equipment || undefined,
        notes: data.notes || undefined,
        updated_at: Date.now(),
      });
    });
  }

  public async removeExercise(id: string): Promise<void> {
    await this.workoutRepository.deleteWorkoutExercise(id);
  }

  public async reorderExercises(exerciseIds: string[]): Promise<void> {
    await this.workoutRepository.reorderWorkoutExercises(exerciseIds);
  }
}
