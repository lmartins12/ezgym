import { inject, Injectable } from '@angular/core';
import { DatabaseService } from '@core/services/database.service';
import type { MuscleGroup } from '@core/models/app-models';
import { formatDuration } from '@shared/utils/date.utils';
import type { SessionDetail, WorkoutEvent } from '../models/dashboard.models';

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
  private readonly dbService = inject(DatabaseService);

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
    await this.dbService.initialize();
    const db = this.dbService.db;

    let sessions = await db.workout_sessions.toArray();

    // Filter by date range
    if (startDate !== null) {
      sessions = sessions.filter((s) => s.started_at >= startDate);
    }
    if (endDate !== null) {
      sessions = sessions.filter((s) => s.started_at <= endDate);
    }

    // Sort descending by started_at
    sessions.sort((a, b) => b.started_at - a.started_at);

    // Apply pagination
    const paginatedSessions = sessions.slice(offset, offset + limit);

    if (paginatedSessions.length === 0) return [];

    const workoutIds = paginatedSessions.map((s) => s.workout_id);
    const workouts = await db.workouts.where('id').anyOf(workoutIds).toArray();
    const workoutMap = new Map(workouts.map((w) => [w.id, w]));

    return paginatedSessions.map((s) => {
      const workout = workoutMap.get(s.workout_id);
      return {
        id: s.id,
        workout_id: s.workout_id,
        started_at: s.started_at,
        finished_at: s.finished_at ?? null,
        notes: s.notes ?? null,
        workout_name: workout?.name ?? null,
        muscle_group: workout?.muscle_group ?? null,
      };
    });
  }

  /**
   * Get count of workout sessions for pagination.
   */
  async getWorkoutSessionsCount(
    startDate: number | null,
    endDate: number | null,
  ): Promise<number> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    let sessions = await db.workout_sessions.toArray();

    if (startDate !== null) {
      sessions = sessions.filter((s) => s.started_at >= startDate);
    }
    if (endDate !== null) {
      sessions = sessions.filter((s) => s.started_at <= endDate);
    }

    return sessions.length;
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
    await this.dbService.initialize();
    const sessions = await this.dbService.db.workout_sessions.toArray();

    const filtered = sessions
      .filter((s) => s.started_at >= startDate && s.started_at <= endDate)
      .map((s) => s.started_at);

    return Array.from(new Set(filtered)).sort((a, b) => b - a);
  }

  /**
   * Get all unique dates with workout sessions (all time).
   * Used for calendar highlighting across all months.
   */
  async getAllDatesWithEvents(): Promise<number[]> {
    await this.dbService.initialize();
    const sessions = await this.dbService.db.workout_sessions.toArray();
    const dates = sessions.map((s) => s.started_at);
    return Array.from(new Set(dates)).sort((a, b) => b - a);
  }

  /**
   * Load session detail from database.
   * Returns a Promise with complete session data.
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const session = await db.workout_sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const workout = await db.workouts.get(session.workout_id);

    // Get set logs
    const setLogs = await db.set_logs
      .where('session_id')
      .equals(sessionId)
      .toArray();

    const exerciseIds = Array.from(new Set(setLogs.map((l) => l.exercise_id)));
    const exercises =
      exerciseIds.length > 0
        ? await db.exercises.where('id').anyOf(exerciseIds).toArray()
        : [];
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    // Group sets by exercise
    const exercisesMap = new Map<string, SessionDetail['exercises'][0]>();

    // Sort set logs by set_number
    setLogs.sort((a, b) => a.set_number - b.set_number);

    for (const log of setLogs) {
      const ex = exerciseMap.get(log.exercise_id);
      if (!exercisesMap.has(log.exercise_id)) {
        exercisesMap.set(log.exercise_id, {
          id: log.exercise_id,
          name: ex?.name ?? 'Unknown Exercise',
          muscleGroup: (ex?.muscle_group as MuscleGroup | null) ?? null,
          equipment: ex?.equipment ?? null,
          sets: [],
        });
      }

      exercisesMap.get(log.exercise_id)!.sets.push({
        setNumber: log.set_number,
        reps: log.reps,
        weight: log.weight ?? null,
        rpe: log.rpe ?? null,
      });
    }

    return {
      sessionId: session.id,
      workoutName: workout?.name ?? 'Workout',
      muscleGroup: (workout?.muscle_group as MuscleGroup | null) ?? null,
      startedAt: session.started_at,
      finishedAt: session.finished_at ?? null,
      notes: session.notes ?? null,
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
      muscle_group: (session.muscle_group ?? undefined) as
        MuscleGroup | undefined,
      finished_at: session.finished_at ?? undefined,
      notes: session.notes ?? undefined,
    };
  }
}
