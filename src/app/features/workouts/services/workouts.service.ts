import { inject, Injectable } from '@angular/core';
import type { Workout } from '@core';
import { DatabaseService } from '@core';
import type { WorkoutDetail } from '../models';

@Injectable({ providedIn: 'root' })
export class WorkoutsService {
  private readonly db = inject(DatabaseService);

  public async getAll(): Promise<WorkoutDetail[]> {
    await this.db.ready();

    const sql = `
      SELECT
        w.*,
        COUNT(we.id) as exercise_count,
        MAX(ws.started_at) as last_trained
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN workout_sessions ws ON w.id = ws.workout_id
      GROUP BY w.id
      ORDER BY w.updated_at DESC
    `;

    return this.db.query<WorkoutDetail>(sql);
  }

  public async getById(id: string): Promise<Workout | null> {
    await this.db.ready();

    const result = await this.db.query<Workout>(
      'SELECT * FROM workouts WHERE id = ?',
      [id],
    );

    return result[0] ?? null;
  }

  public async create(name: string, description?: string): Promise<string> {
    await this.db.ready();

    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.execute(
      'INSERT INTO workouts (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, description ?? null, now, now],
    );

    return id;
  }

  public async update(
    id: string,
    name: string,
    description?: string,
  ): Promise<void> {
    await this.db.ready();

    const now = Date.now();

    await this.db.execute(
      'UPDATE workouts SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [name, description ?? null, now, id],
    );
  }

  public async delete(id: string): Promise<void> {
    await this.db.ready();

    await this.db.execute('DELETE FROM workouts WHERE id = ?', [id]);
  }
}
