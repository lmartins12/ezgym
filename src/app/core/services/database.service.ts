import { Injectable, signal } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'ezgym_db';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly sqlite: SQLiteConnection = new SQLiteConnection(
    CapacitorSQLite,
  );
  private db: SQLiteDBConnection | null = null;

  private readonly isReady = signal(false);
  public readonly ready = this.isReady.asReadonly();

  public async initialize(): Promise<void> {
    if (this.isReady()) return;

    try {
      const retCC = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (retCC.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          1,
          false,
        );
      }

      await this.db.open();
      await this.createTables();
      this.isReady.set(true);
    } catch (err) {
      console.error('Database initialization failed:', err);
      throw err;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const schema = `
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        sets INTEGER NOT NULL DEFAULT 3,
        reps TEXT NOT NULL DEFAULT '12',
        rest_seconds INTEGER NOT NULL DEFAULT 60,
        target_weight REAL,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        notes TEXT,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS set_logs (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL,
        rpe REAL,
        completed_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout ON workout_sessions(workout_id);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
    `;

    await this.db.execute(schema);
  }

  public async getExerciseProgress(
    exerciseId: string,
  ): Promise<{ date: number; maxWeight: number; totalVolume: number }[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      SELECT 
        s.started_at as date,
        MAX(l.weight) as maxWeight,
        SUM(l.weight * l.reps) as totalVolume
      FROM set_logs l
      JOIN workout_sessions s ON l.session_id = s.id
      WHERE l.exercise_id = ?
      GROUP BY s.id
      ORDER BY s.started_at ASC
    `;

    const result = await this.db.query(sql, [exerciseId]);
    return (result.values as any[]) ?? [];
  }

  public async execute(sql: string, values?: unknown[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(sql, values);
  }

  public async query<T>(sql: string, values?: unknown[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.query(sql, values);
    return (result.values as T[]) ?? [];
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(DB_NAME, false);
      this.db = null;
      this.isReady.set(false);
    }
  }
}
