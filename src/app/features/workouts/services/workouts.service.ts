import { inject, Injectable } from '@angular/core';
import type { MuscleGroup, Workout } from '@core/models/app-models';
import { DatabaseService } from '@core/services/database.service';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutDetail } from '../models/workout-detail.model';

@Injectable({ providedIn: 'root' })
export class WorkoutsService {
  private readonly dbService = inject(DatabaseService);

  public async getAll(): Promise<WorkoutDetail[]> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const [workouts, exerciseCountMap, lastTrainedMap] = await Promise.all([
      db.workouts.orderBy('order_index').toArray(),
      this.buildExerciseCountMap(),
      this.buildLastTrainedMap(),
    ]);

    const details: WorkoutDetail[] = workouts.map((w) => ({
      ...w,
      order_index: w.order_index ?? 0,
      exercise_count: exerciseCountMap.get(w.id) ?? 0,
      last_trained: lastTrainedMap.get(w.id) ?? undefined,
    }));

    // Sort by order_index ASC, updated_at DESC
    return details.sort((a, b) => {
      const orderA = a.order_index ?? 0;
      const orderB = b.order_index ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (b.updated_at ?? 0) - (a.updated_at ?? 0);
    });
  }

  /**
   * Exercise count per workout via cursor — no materialization.
   */
  private async buildExerciseCountMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    await this.dbService.db.workout_exercises.each((we) => {
      map.set(we.workout_id, (map.get(we.workout_id) ?? 0) + 1);
    });
    return map;
  }

  /**
   * Last trained timestamp per workout via cursor — no materialization.
   */
  private async buildLastTrainedMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    await this.dbService.db.workout_sessions.each((session) => {
      const current = map.get(session.workout_id);
      if (!current || session.started_at > current) {
        map.set(session.workout_id, session.started_at);
      }
    });
    return map;
  }

  public async getById(id: string): Promise<Workout | null> {
    await this.dbService.initialize();
    const workout = await this.dbService.db.workouts.get(id);
    return workout ?? null;
  }

  public async create(
    name: string,
    description?: string,
    muscleGroup?: MuscleGroup,
  ): Promise<string> {
    await this.dbService.initialize();
    const id = uuidv4();
    const now = Date.now();

    // Get max order index
    const workouts = await this.dbService.db.workouts.toArray();
    const maxOrder = workouts.reduce(
      (max, w) => Math.max(max, w.order_index ?? 0),
      -1,
    );

    const newWorkout: Workout = {
      id,
      name,
      description: description || undefined,
      muscle_group: muscleGroup || undefined,
      order_index: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    await this.dbService.db.workouts.add(newWorkout);
    return id;
  }

  public async update(
    id: string,
    name: string,
    description?: string,
    muscleGroup?: MuscleGroup,
  ): Promise<void> {
    await this.dbService.initialize();
    const now = Date.now();

    await this.dbService.db.workouts.update(id, {
      name,
      description: description || undefined,
      muscle_group: muscleGroup || undefined,
      updated_at: now,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    await db.transaction(
      'rw',
      [db.workouts, db.workout_exercises, db.workout_sessions, db.set_logs],
      async () => {
        // Find associated sessions to delete their set_logs
        const sessions = await db.workout_sessions
          .where('workout_id')
          .equals(id)
          .toArray();
        const sessionIds = sessions.map((s) => s.id);

        if (sessionIds.length > 0) {
          await db.set_logs.where('session_id').anyOf(sessionIds).delete();
          await db.workout_sessions.where('workout_id').equals(id).delete();
        }

        await db.workout_exercises.where('workout_id').equals(id).delete();
        await db.workouts.delete(id);
      },
    );
  }

  /**
   * Persist a new workout order atomically.
   */
  public async reorderWorkouts(workoutIds: string[]): Promise<void> {
    await this.dbService.initialize();
    const db = this.dbService.db;

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
}
