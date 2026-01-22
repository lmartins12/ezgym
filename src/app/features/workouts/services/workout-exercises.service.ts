import { inject, Injectable } from '@angular/core';
import type { Exercise, WorkoutExercise } from '@core';
import { DatabaseService } from '@core';
import { v4 as uuidv4 } from 'uuid';
import type { AddExerciseData, UpdateExerciseData } from '../models';

@Injectable({ providedIn: 'root' })
export class WorkoutExercisesService {
  private readonly db = inject(DatabaseService);

  public async getByWorkoutId(workoutId: string): Promise<WorkoutExercise[]> {
    await this.db.ready();

    const sql = `
      SELECT
        we.*,
        e.name as exercise_name,
        e.muscle_group,
        e.equipment
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = ?
      ORDER BY we.order_index ASC
    `;

    return this.db.query<WorkoutExercise>(sql, [workoutId]);
  }

  public async addExercise(data: AddExerciseData): Promise<string> {
    await this.db.ready();

    // Create-or-find exercise by name
    const exerciseId = await this.findOrCreateExercise(data);

    // Get next order index
    const maxOrder = await this.getMaxOrderIndex(data.workoutId);
    const orderIndex = maxOrder + 1;

    // Create workout_exercise entry
    const id = uuidv4();

    await this.db.execute(
      `INSERT INTO workout_exercises
       (id, workout_id, exercise_id, order_index, sets, reps, rest_seconds, target_weight)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.workoutId,
        exerciseId,
        orderIndex,
        data.sets,
        data.reps,
        data.restSeconds,
        data.targetWeight ?? null,
      ],
    );

    return id;
  }

  public async updateExercise(
    id: string,
    data: UpdateExerciseData,
  ): Promise<void> {
    await this.db.ready();

    await this.db.execute(
      `UPDATE workout_exercises
       SET sets = ?, reps = ?, rest_seconds = ?, target_weight = ?
       WHERE id = ?`,
      [data.sets, data.reps, data.restSeconds, data.targetWeight ?? null, id],
    );
  }

  public async removeExercise(id: string): Promise<void> {
    await this.db.ready();

    await this.db.execute('DELETE FROM workout_exercises WHERE id = ?', [id]);
  }

  public async reorderExercises(
    workoutId: string,
    exerciseIds: string[],
  ): Promise<void> {
    await this.db.ready();

    // Transactional reordering
    const updates = exerciseIds.map((id, index) =>
      this.db.execute(
        'UPDATE workout_exercises SET order_index = ? WHERE id = ?',
        [index, id],
      ),
    );

    await Promise.all(updates);
  }

  private async findOrCreateExercise(data: AddExerciseData): Promise<string> {
    // Try to find existing exercise by name (case-insensitive)
    const existing = await this.db.query<Exercise>(
      'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?)',
      [data.name],
    );

    if (existing.length > 0) {
      // Update exercise with new data
      await this.db.execute(
        'UPDATE exercises SET muscle_group = ?, equipment = ?, notes = ?, updated_at = ? WHERE id = ?',
        [
          data.muscleGroup,
          data.equipment ?? null,
          data.notes ?? null,
          Date.now(),
          existing[0].id,
        ],
      );
      return existing[0].id;
    }

    // Create new exercise
    const id = uuidv4();
    const now = Date.now();

    await this.db.execute(
      'INSERT INTO exercises (id, name, muscle_group, equipment, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.name,
        data.muscleGroup,
        data.equipment ?? null,
        data.notes ?? null,
        now,
        now,
      ],
    );

    return id;
  }

  private async getMaxOrderIndex(workoutId: string): Promise<number> {
    const result = await this.db.query<{ max_order: number }>(
      'SELECT COALESCE(MAX(order_index), -1) as max_order FROM workout_exercises WHERE workout_id = ?',
      [workoutId],
    );

    return result[0]?.max_order ?? -1;
  }
}
