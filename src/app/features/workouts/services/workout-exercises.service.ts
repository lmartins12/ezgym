import { inject, Injectable } from '@angular/core';
import type { WorkoutExercise } from '@core/models/app-models';
import {
  ExerciseRepository,
  type ExerciseSeedData,
} from '@core/services/exercise-repository.service';
import { DatabaseService } from '@core/services/database.service';
import { v4 as uuidv4 } from 'uuid';
import type {
  AddExerciseData,
  UpdateExerciseData,
} from '../models/workout-detail.model';

@Injectable({ providedIn: 'root' })
export class WorkoutExercisesService {
  private readonly dbService = inject(DatabaseService);
  private readonly exerciseRepository = inject(ExerciseRepository);

  public getByWorkoutId(workoutId: string): Promise<WorkoutExercise[]> {
    return this.exerciseRepository.getDetailedByWorkoutId(workoutId);
  }

  public async addExercise(data: AddExerciseData): Promise<string> {
    await this.dbService.initialize();
    const db = this.dbService.db;

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
    const db = this.dbService.db;

    await db.transaction(
      'rw',
      [db.workout_exercises, db.exercises],
      async () => {
        const row = await db.workout_exercises.get(id);
        if (!row) return;

        await db.workout_exercises.update(id, {
          sets: data.sets,
          reps: data.reps,
          rest_seconds: data.restSeconds,
          target_weight: data.targetWeight ?? undefined,
        });

        // Manual edits keep the canonical catalog entry in sync — same
        // metadata semantics as addExercise (overwriteMetadata). Updated
        // by id (not name) so partial edits never create duplicates; the
        // metadata is shared by every workout referencing the exercise.
        await db.exercises.update(row.exercise_id, {
          name: data.name.trim(),
          muscle_group: data.muscleGroup,
          equipment: data.equipment || undefined,
          notes: data.notes || undefined,
          updated_at: Date.now(),
        });
      },
    );
  }

  public async removeExercise(id: string): Promise<void> {
    await this.dbService.initialize();
    await this.dbService.db.workout_exercises.delete(id);
  }

  public async reorderExercises(exerciseIds: string[]): Promise<void> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    await db.transaction('rw', db.workout_exercises, async () => {
      for (let i = 0; i < exerciseIds.length; i++) {
        await db.workout_exercises.update(exerciseIds[i], { order_index: i });
      }
    });
  }

  private async getMaxOrderIndex(workoutId: string): Promise<number> {
    const items = await this.dbService.db.workout_exercises
      .where('workout_id')
      .equals(workoutId)
      .toArray();

    return items.reduce((max, item) => Math.max(max, item.order_index), -1);
  }
}
