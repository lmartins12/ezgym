import { Injectable, signal } from '@angular/core';
import { db, EzGymDatabase } from './app-db';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  public readonly db: EzGymDatabase = db;

  private readonly isReady = signal(false);
  public readonly ready = this.isReady.asReadonly();

  public async initialize(): Promise<void> {
    if (this.isReady()) return;

    try {
      if (!this.db.isOpen()) {
        await this.db.open();
      }
      this.isReady.set(true);
    } catch (err) {
      console.error('Database initialization failed:', err);
      throw err;
    }
  }

  public async getExerciseProgress(
    exerciseId: string,
  ): Promise<{ date: number; maxWeight: number; totalVolume: number }[]> {
    await this.initialize();

    // Get all set logs for this exercise
    const logs = await this.db.set_logs
      .where('exercise_id')
      .equals(exerciseId)
      .toArray();

    if (logs.length === 0) return [];

    // Group logs by session_id
    const logsBySession = new Map<string, typeof logs>();
    for (const log of logs) {
      const existing = logsBySession.get(log.session_id) ?? [];
      existing.push(log);
      logsBySession.set(log.session_id, existing);
    }

    const sessionIds = Array.from(logsBySession.keys());
    const sessions = await this.db.workout_sessions
      .where('id')
      .anyOf(sessionIds)
      .toArray();

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const progressList: { date: number; maxWeight: number; totalVolume: number }[] = [];

    for (const [sessionId, sessionLogs] of logsBySession.entries()) {
      const session = sessionMap.get(sessionId);
      if (!session) continue;

      let maxWeight = 0;
      let totalVolume = 0;

      for (const log of sessionLogs) {
        const weight = log.weight ?? 0;
        if (weight > maxWeight) maxWeight = weight;
        totalVolume += weight * log.reps;
      }

      progressList.push({
        date: session.started_at,
        maxWeight,
        totalVolume,
      });
    }

    return progressList.sort((a, b) => a.date - b.date);
  }

  public async updateWorkoutOrder(workoutId: string, orderIndex: number): Promise<void> {
    await this.initialize();
    await this.db.workouts.update(workoutId, {
      order_index: orderIndex,
      updated_at: Date.now(),
    });
  }

  public async close(): Promise<void> {
    this.db.close();
    this.isReady.set(false);
  }
}
