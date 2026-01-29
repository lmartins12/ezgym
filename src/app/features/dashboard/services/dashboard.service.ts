import { inject, Injectable } from '@angular/core';
import type { MuscleGroup } from '@core';
import { DatabaseService } from '@core';
import type { SessionDetail, WorkoutEvent } from '../models';
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

/**
 * Result of set logs query with exercise data.
 */
interface SetLogQueryResult {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string | null;
  equipment: string | null;
  set_number: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
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
   * Load session detail from database.
   * Returns a Promise with complete session data.
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    await this.db.ready();

    // Get session data
    const sessionSql = `
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
      WHERE ws.id = ?
    `;

    const sessionResult = await this.db.query<WorkoutSessionQueryResult>(sessionSql, [
      sessionId,
    ]);

    if (sessionResult.length === 0) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const session = sessionResult[0];

    // Get set logs with exercise data
    const setsSql = `
      SELECT
        e.id as exercise_id,
        e.name as exercise_name,
        e.muscle_group,
        e.equipment,
        sl.set_number,
        sl.reps,
        sl.weight,
        sl.rpe
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      WHERE sl.session_id = ?
      ORDER BY e.name, sl.set_number
    `;

    const setsResult = await this.db.query<SetLogQueryResult>(setsSql, [sessionId]);

    // Group sets by exercise
    const exercisesMap = new Map<string, SessionDetail['exercises'][0]>();

    for (const set of setsResult) {
      if (!exercisesMap.has(set.exercise_id)) {
        exercisesMap.set(set.exercise_id, {
          id: set.exercise_id,
          name: set.exercise_name,
          muscleGroup: set.muscle_group as MuscleGroup | null,
          equipment: set.equipment,
          sets: [],
        });
      }

      exercisesMap.get(set.exercise_id)!.sets.push({
        setNumber: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe,
      });
    }

    return {
      sessionId: session.id,
      workoutName: session.workout_name ?? 'Workout',
      muscleGroup: session.muscle_group as MuscleGroup | null,
      startedAt: session.started_at,
      finishedAt: session.finished_at,
      notes: session.notes,
      exercises: Array.from(exercisesMap.values()),
    };
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
