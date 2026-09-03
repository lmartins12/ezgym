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
  private writeDepth = 0;

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
   * Permanently deletes the whole IndexedDB database and reopens a
   * fresh, empty connection. Irreversible.
   */
  public async wipe(): Promise<void> {
    db.close();
    this.isReady.set(false);
    await db.delete();
    await this.initialize();
  }

  /**
   * True while a write() transaction is on the stack. Repository
   * methods skip their defensive initialize() await in that case:
   * the connection is already open (write() guarantees it) and
   * awaiting a native promise mid-transaction can prematurely
   * commit it on real IndexedDB (PrematureCommitError). Only Dexie
   * promises may be awaited inside write().
   */
  public get inWriteTransaction(): boolean {
    return this.writeDepth > 0;
  }

  /**
   * Runs fn inside a read-write transaction over every table.
   * Repository calls made inside fn join this transaction.
   */
  public async write<T>(fn: () => Promise<T>): Promise<T> {
    await this.initialize();
    this.writeDepth++;
    try {
      return await db.transaction(
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
    } finally {
      this.writeDepth--;
    }
  }
}
