import { inject, Injectable } from '@angular/core';
import { db } from '@core/db/app-db';
import { DatabaseService } from '@core/db/database';
import { ExerciseRepository } from '@domain/exercises/exercise.repository';
import type { Workout } from './workout';
import type { WorkoutExercise } from './workout-exercise';

/**
 * Persistence for the Workout aggregate: the workout row plus its
 * workout-exercise children (including the join with the exercise
 * catalog that produces the denormalized read-model rows).
 */
@Injectable({ providedIn: 'root' })
export class WorkoutRepository {
  private readonly database = inject(DatabaseService);
  private readonly exerciseRepository = inject(ExerciseRepository);

  // --- Aggregate root: Workout ---

  public async getAll(): Promise<Workout[]> {
    await this.database.initialize();
    return db.workouts.toArray();
  }

  public async getByIds(ids: string[]): Promise<Workout[]> {
    await this.database.initialize();
    if (ids.length === 0) return [];
    return db.workouts.where('id').anyOf(ids).toArray();
  }

  public async getById(id: string): Promise<Workout | null> {
    await this.database.initialize();
    const workout = await db.workouts.get(id);
    return workout ?? null;
  }

  public async add(workout: Workout): Promise<void> {
    await this.database.initialize();
    await db.workouts.add(workout);
  }

  public async update(id: string, changes: Partial<Workout>): Promise<void> {
    await this.database.initialize();
    await db.workouts.update(id, changes);
  }

  public async delete(id: string): Promise<void> {
    await this.database.initialize();
    await db.workouts.delete(id);
  }

  /**
   * Highest order_index among workouts, or -1 when the table is empty.
   */
  public async getMaxOrderIndex(): Promise<number> {
    await this.database.initialize();
    const workouts = await db.workouts.toArray();
    return workouts.reduce((max, w) => Math.max(max, w.order_index ?? 0), -1);
  }

  /**
   * Persists a new workout order atomically.
   */
  public async reorder(workoutIds: string[]): Promise<void> {
    await this.database.initialize();
    await db.transaction('rw', db.workouts, async () => {
      const now = Date.now();
      for (let i = 0; i < workoutIds.length; i++) {
        await db.workouts.update(workoutIds[i], {
          order_index: i,
          updated_at: now,
        });
      }
    });
  }

  // --- Child: WorkoutExercise ---

  public async getWorkoutExercises(
    workoutId: string,
  ): Promise<WorkoutExercise[]> {
    await this.database.initialize();
    return db.workout_exercises.where('workout_id').equals(workoutId).toArray();
  }

  public async getAllWorkoutExercises(): Promise<WorkoutExercise[]> {
    await this.database.initialize();
    return db.workout_exercises.toArray();
  }

  /**
   * Workout exercises joined with their exercise data, sorted by order.
   */
  public async getDetailedWorkoutExercises(
    workoutId: string,
  ): Promise<WorkoutExercise[]> {
    const workoutExercises = await this.getWorkoutExercises(workoutId);
    if (workoutExercises.length === 0) return [];

    const exerciseIds = workoutExercises.map((we) => we.exercise_id);
    const exercises = await this.exerciseRepository.getByIds(exerciseIds);
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    return workoutExercises
      .map((we) => {
        const ex = exerciseMap.get(we.exercise_id);
        return {
          ...we,
          exercise_name: ex?.name,
          muscle_group: ex?.muscle_group,
          equipment: ex?.equipment,
          notes: ex?.notes,
        };
      })
      .sort((a, b) => a.order_index - b.order_index);
  }

  /**
   * Exercise count per workout via cursor — no materialization.
   */
  public async getExerciseCountMap(): Promise<Map<string, number>> {
    await this.database.initialize();
    const map = new Map<string, number>();
    await db.workout_exercises.each((we) => {
      map.set(we.workout_id, (map.get(we.workout_id) ?? 0) + 1);
    });
    return map;
  }

  public async addWorkoutExercise(
    workoutExercise: WorkoutExercise,
  ): Promise<void> {
    await this.database.initialize();
    await db.workout_exercises.add(workoutExercise);
  }

  public async updateWorkoutExercise(
    id: string,
    changes: Partial<WorkoutExercise>,
  ): Promise<void> {
    await this.database.initialize();
    await db.workout_exercises.update(id, changes);
  }

  public async getWorkoutExercise(
    id: string,
  ): Promise<WorkoutExercise | undefined> {
    await this.database.initialize();
    return db.workout_exercises.get(id);
  }

  public async deleteWorkoutExercise(id: string): Promise<void> {
    await this.database.initialize();
    await db.workout_exercises.delete(id);
  }

  /**
   * Deletes every workout-exercise row of a workout (cascade).
   */
  public async deleteWorkoutExercises(workoutId: string): Promise<void> {
    await this.database.initialize();
    await db.workout_exercises.where('workout_id').equals(workoutId).delete();
  }

  public async reorderWorkoutExercises(
    workoutExerciseIds: string[],
  ): Promise<void> {
    await this.database.initialize();
    await db.transaction('rw', db.workout_exercises, async () => {
      for (let i = 0; i < workoutExerciseIds.length; i++) {
        await db.workout_exercises.update(workoutExerciseIds[i], {
          order_index: i,
        });
      }
    });
  }

  /**
   * Highest order_index among a workout's exercises, or -1 when empty.
   */
  public async getWorkoutExerciseMaxOrderIndex(
    workoutId: string,
  ): Promise<number> {
    const items = await this.getWorkoutExercises(workoutId);
    return items.reduce((max, item) => Math.max(max, item.order_index), -1);
  }
}
