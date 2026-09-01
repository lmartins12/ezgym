import { inject, Injectable } from '@angular/core';
import { ExerciseRepository } from '@domain/exercises/exercise.repository';
import { SessionRepository } from '@domain/sessions/session.repository';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
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

/**
 * Read-model for the dashboard screen: paginated history, calendar
 * dates and session detail. Pure queries — the page owns UI state.
 */
@Injectable({ providedIn: 'root' })
export class DashboardQuery {
  private readonly sessionRepository = inject(SessionRepository);
  private readonly workoutRepository = inject(WorkoutRepository);
  private readonly exerciseRepository = inject(ExerciseRepository);

  /**
   * Fetch workout sessions with pagination (index-backed).
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
    const sessions = await this.sessionRepository.getByStartedAtRange(
      startDate,
      endDate,
      offset,
      limit,
    );

    if (sessions.length === 0) return [];

    const workoutIds = sessions.map((s) => s.workout_id);
    const workouts = await this.workoutRepository.getByIds(workoutIds);
    const workoutMap = new Map(workouts.map((w) => [w.id, w]));

    return sessions.map((s) => {
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
   * Get count of workout sessions for pagination (index-backed).
   */
  async getWorkoutSessionsCount(
    startDate: number | null,
    endDate: number | null,
  ): Promise<number> {
    return this.sessionRepository.countByStartedAtRange(startDate, endDate);
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
    return this.sessionRepository.getEventDates(startDate, endDate);
  }

  /**
   * Get all unique dates with workout sessions (all time).
   * Used for calendar highlighting across all months.
   */
  async getAllDatesWithEvents(): Promise<number[]> {
    return this.sessionRepository.getAllEventDates();
  }

  /**
   * Load session detail from database.
   * Returns a Promise with complete session data.
   */
  async getSessionDetail(sessionId: string): Promise<SessionDetail> {
    const session = await this.sessionRepository.getById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const workout = await this.workoutRepository.getById(session.workout_id);
    const setLogs = await this.sessionRepository.getLogsBySession(sessionId);

    const exerciseIds = Array.from(new Set(setLogs.map((l) => l.exercise_id)));
    const exercises = await this.exerciseRepository.getByIds(exerciseIds);
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    // Group sets by exercise
    const exercisesMap = new Map<string, SessionDetail['exercises'][0]>();

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
