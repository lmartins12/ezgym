import { Injectable, signal } from '@angular/core';
import { db } from './app-db';

/**
 * Owns the Dexie connection lifecycle. The instance is intentionally
 * not exposed: data access goes through domain repositories. Writes
 * that span more than one aggregate use write() so every operation
 * joins a single atomic transaction.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly isReady = signal(false);
  public readonly ready = this.isReady.asReadonly();

  public async initialize(): Promise<void> {
    if (this.isReady()) return;

    try {
      if (!db.isOpen()) {
        await db.open();
      }
      this.isReady.set(true);
    } catch (err) {
      console.error('Database initialization failed:', err);
      throw err;
    }
  }

  public async close(): Promise<void> {
    db.close();
    this.isReady.set(false);
  }

  /**
   * Runs fn inside a read-write transaction over every table.
   * Repository calls made inside fn join this transaction.
   */
  public async write<T>(fn: () => Promise<T>): Promise<T> {
    await this.initialize();
    return db.transaction(
      'rw',
      [
        db.exercises,
        db.workouts,
        db.workout_exercises,
        db.workout_sessions,
        db.set_logs,
      ],
      fn,
    );
  }
}
