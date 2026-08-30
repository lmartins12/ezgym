import { inject, Injectable } from '@angular/core';
import type { Exercise, WorkoutExercise } from '@core/models/app-models';
import { DatabaseService } from '@core/services/database.service';
import { v4 as uuidv4 } from 'uuid';
import type {
  AddExerciseData,
  UpdateExerciseData,
} from '../models/workout-detail.model';

@Injectable({ providedIn: 'root' })
export class WorkoutExercisesService {
  private readonly dbService = inject(DatabaseService);

  public async getByWorkoutId(workoutId: string): Promise<WorkoutExercise[]> {
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

    const result: WorkoutExercise[] = workoutExercises.map((we) => {
      const ex = exerciseMap.get(we.exercise_id);
      return {
        ...we,
        exercise_name: ex?.name,
        muscle_group: ex?.muscle_group,
        equipment: ex?.equipment,
      };
    });

    return result.sort((a, b) => a.order_index - b.order_index);
  }

  public async addExercise(data: AddExerciseData): Promise<string> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    // Create-or-find exercise by name
    const exerciseId = await this.findOrCreateExercise(data);

    // Get next order index
    const maxOrder = await this.getMaxOrderIndex(data.workoutId);
    const orderIndex = maxOrder + 1;

    const id = uuidv4();
    const newWorkoutExercise: WorkoutExercise = {
      id,
      workout_id: data.workoutId,
      exercise_id: exerciseId,
      order_index: orderIndex,
      sets: data.sets,
      reps: data.reps,
      rest_seconds: data.restSeconds,
      target_weight: data.targetWeight ?? undefined,
    };

    await db.workout_exercises.add(newWorkoutExercise);
    return id;
  }

  public async updateExercise(
    id: string,
    data: UpdateExerciseData,
  ): Promise<void> {
    await this.dbService.initialize();
    await this.dbService.db.workout_exercises.update(id, {
      sets: data.sets,
      reps: data.reps,
      rest_seconds: data.restSeconds,
      target_weight: data.targetWeight ?? undefined,
    });
  }

  public async removeExercise(id: string): Promise<void> {
    await this.dbService.initialize();
    await this.dbService.db.workout_exercises.delete(id);
  }

  public async reorderExercises(
    _workoutId: string,
    exerciseIds: string[],
  ): Promise<void> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    await db.transaction('rw', db.workout_exercises, async () => {
      for (let i = 0; i < exerciseIds.length; i++) {
        await db.workout_exercises.update(exerciseIds[i], { order_index: i });
      }
    });
  }

  private async findOrCreateExercise(data: AddExerciseData): Promise<string> {
    const db = this.dbService.db;
    const normalizedName = data.name.trim().toLowerCase();

    // Find existing exercise by case-insensitive name
    const allExercises = await db.exercises.toArray();
    const existing = allExercises.find(
      (e) => e.name.trim().toLowerCase() === normalizedName,
    );

    const now = Date.now();

    if (existing) {
      await db.exercises.update(existing.id, {
        muscle_group: data.muscleGroup,
        equipment: data.equipment || undefined,
        notes: data.notes || undefined,
        updated_at: now,
      });
      return existing.id;
    }

    const id = uuidv4();
    const newExercise: Exercise = {
      id,
      name: data.name.trim(),
      muscle_group: data.muscleGroup,
      equipment: data.equipment || undefined,
      notes: data.notes || undefined,
      created_at: now,
      updated_at: now,
    };

    await db.exercises.add(newExercise);
    return id;
  }

  private async getMaxOrderIndex(workoutId: string): Promise<number> {
    const items = await this.dbService.db.workout_exercises
      .where('workout_id')
      .equals(workoutId)
      .toArray();

    return items.reduce((max, item) => Math.max(max, item.order_index), -1);
  }
}
