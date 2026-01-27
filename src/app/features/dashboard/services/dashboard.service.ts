import { inject, Injectable } from '@angular/core';
import type { MuscleGroup } from '@core';
import { DatabaseService } from '@core';
import type { WorkoutEvent } from '../models';
import { formatDuration } from '@shared';

/**
 * Result of workout session query with joined workout data.
 */
interface WorkoutSessionQueryResult {
  id: string;
  workout_id: string;
  started_at: number;
  finished_at: number | null;
  notes: string | null;
  workout_name: string | null;
  muscle_group: string | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly db = inject(DatabaseService);

  /**
   * Fetch workout sessions with pagination.
   * @param startDate Unix timestamp (ms) or null for no start limit
   * @param endDate Unix timestamp (ms) or null for no end limit
   * @param offset Number of records to skip
   * @param limit Number of records to fetch
   */
  async getWorkoutSessions(
    startDate: number | null,
    endDate: number | null,
    offset: number,
    limit: number,
  ): Promise<WorkoutSessionQueryResult[]> {
    await this.db.ready();

    let sql = `
      SELECT
        ws.id,
        ws.workout_id,
        ws.started_at,
        ws.finished_at,
        ws.notes,
        w.name as workout_name,
        w.muscle_group
      FROM workout_sessions ws
      JOIN workouts w ON ws.workout_id = w.id
    `;

    const conditions: string[] = [];
    const params: (number | string)[] = [];

    if (startDate !== null) {
      conditions.push('ws.started_at >= ?');
      params.push(startDate);
    }

    if (endDate !== null) {
      conditions.push('ws.started_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY ws.started_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.query<WorkoutSessionQueryResult>(sql, params);
  }

  /**
   * Get count of workout sessions for pagination.
   */
  async getWorkoutSessionsCount(
    startDate: number | null,
    endDate: number | null,
  ): Promise<number> {
    await this.db.ready();

    let sql = 'SELECT COUNT(*) as count FROM workout_sessions ws';
    const conditions: string[] = [];
    const params: (number | string)[] = [];

    if (startDate !== null) {
      conditions.push('ws.started_at >= ?');
      params.push(startDate);
    }

    if (endDate !== null) {
      conditions.push('ws.started_at <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await this.db.query<{ count: number }>(sql, params);
    return result[0]?.count ?? 0;
  }

  /**
   * Get all unique dates with workout sessions for calendar highlighting.
   * @param startDate Start of month (Unix timestamp)
   * @param endDate End of month (Unix timestamp)
   */
  async getDatesWithEvents(
    startDate: number,
    endDate: number,
  ): Promise<number[]> {
    await this.db.ready();

    const sql = `
      SELECT DISTINCT started_at
      FROM workout_sessions
      WHERE started_at >= ? AND started_at <= ?
      ORDER BY started_at DESC
    `;

    const results = await this.db.query<{ started_at: number }>(sql, [
      startDate,
      endDate,
    ]);

    return results.map((r) => r.started_at);
  }

  /**
   * Get all unique dates with workout sessions (all time).
   * Used for calendar highlighting across all months.
   */
  async getAllDatesWithEvents(): Promise<number[]> {
    await this.db.ready();

    const sql = `
      SELECT DISTINCT started_at
      FROM workout_sessions
      ORDER BY started_at DESC
    `;

    const results = await this.db.query<{ started_at: number }>(sql);

    return results.map((r) => r.started_at);
  }

  /**
   * Convert WorkoutSession query result to WorkoutEvent.
   */
  workoutSessionToEvent(session: WorkoutSessionQueryResult): WorkoutEvent {
    const subtitle = session.finished_at
      ? formatDuration(session.finished_at - session.started_at)
      : undefined;

    return {
      id: session.id,
      type: 'workout',
      timestamp: session.started_at,
      title: session.workout_name ?? 'Workout',
      subtitle,
      workout_id: session.workout_id,
      workout_name: session.workout_name ?? '',
      muscle_group: (session.muscle_group ?? undefined) as MuscleGroup | undefined,
      finished_at: session.finished_at ?? undefined,
      notes: session.notes ?? undefined,
    };
  }
}
