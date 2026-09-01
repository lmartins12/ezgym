import { computed, inject, Injectable, signal } from '@angular/core';
import { DatabaseService } from '@core/services/database.service';
import { ExerciseRepository } from '@core/services/exercise-repository.service';
import { HapticsService } from '@core/services/haptics.service';
import type {
  SetLog,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '@core/models/app-models';
import {
  LOG_REPS_RANGE,
  RPE_RANGE,
  WEIGHT_RANGE,
  clampToRange,
} from '@core/models/limits';
import { v4 as uuidv4 } from 'uuid';

export type SessionState =
  'PREPARING' | 'IN_PROGRESS' | 'FINISHING' | 'COMPLETED';

/**
 * Root-singleton session store: an in-progress workout must survive
 * tab switches, so the state intentionally outlives the session route.
 * Navigation decisions belong to SessionPage, not here.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly dbService = inject(DatabaseService);
  private readonly exerciseRepository = inject(ExerciseRepository);
  private readonly haptics = inject(HapticsService);

  // State Signals
  public readonly state = signal<SessionState>('PREPARING');
  public readonly workout = signal<Workout | null>(null);
  public readonly exercises = signal<WorkoutExercise[]>([]);
  public readonly activeSession = signal<WorkoutSession | null>(null);
  public readonly setLogs = signal<SetLog[]>([]);

  // Computed
  public readonly isSessionActive = computed(
    () => this.state() === 'IN_PROGRESS' || this.state() === 'FINISHING',
  );

  /**
   * Initialize for Dashboard: Check for ANY active session.
   */
  public async checkActiveSession(): Promise<void> {
    this.resetState();
    await this.dbService.initialize();
    const db = this.dbService.db;

    const existingSession = await this.getMostRecentActiveSession();

    if (existingSession) {
      const workout = await db.workouts.get(existingSession.workout_id);
      this.workout.set(workout ?? null);
      this.activeSession.set(existingSession);
    }
  }

  /**
   * Initialize the session view for a workout.
   * Recovers an abandoned active session for the same workout when one
   * exists, otherwise prepares a fresh PREPARING state.
   * @returns false when the workout does not exist (caller navigates).
   */
  public async initialize(workoutId: string): Promise<boolean> {
    this.resetState();
    await this.dbService.initialize();
    const db = this.dbService.db;

    // 0. Check for Abandoned Session (Recovery)
    const existingSession = await this.getMostRecentActiveSession();

    if (existingSession && existingSession.workout_id === workoutId) {
      const workout = await db.workouts.get(workoutId);
      this.workout.set(workout ?? null);
      this.exercises.set(
        await this.exerciseRepository.getDetailedByWorkoutId(workoutId),
      );

      // Load Logs for this session
      const logs = await db.set_logs
        .where('session_id')
        .equals(existingSession.id)
        .toArray();

      this.setLogs.set(logs.sort((a, b) => a.set_number - b.set_number));
      this.activeSession.set(existingSession);
      this.state.set('IN_PROGRESS');
      return true;
    }

    // 1. Load Workout Details (Normal Flow)
    const workout = await db.workouts.get(workoutId);

    if (!workout) {
      return false;
    }

    this.workout.set(workout);

    // 2. Load Exercises
    this.exercises.set(
      await this.exerciseRepository.getDetailedByWorkoutId(workoutId),
    );
    this.state.set('PREPARING');
    return true;
  }

  /**
   * The active session is always the most recent one (started_at desc).
   * Legacy data may hold more than one IN_PROGRESS session (e.g. created
   * before the duplicate-start guard existed); the older ones stay orphaned
   * unless a user finalizes them, so we flag it for maintenance.
   */
  private async getMostRecentActiveSession(): Promise<WorkoutSession | null> {
    const activeSessions = await this.dbService.db.workout_sessions
      .where('status')
      .equals('IN_PROGRESS')
      .toArray();

    if (activeSessions.length > 1) {
      console.warn(
        `[SessionService] Found ${activeSessions.length} active sessions; adopting the most recent one.`,
      );
    }

    activeSessions.sort((a, b) => b.started_at - a.started_at);
    return activeSessions[0] ?? null;
  }

  /**
   * Start the workout execution.
   * Creates the session record in DB, or adopts the existing active
   * session for this workout (e.g. double tap / race with recovery).
   */
  public async startSession(): Promise<void> {
    const workout = this.workout();
    if (!workout) return;

    await this.dbService.initialize();
    const db = this.dbService.db;

    // Guard: never create a second active session for the same workout
    const existing = await db.workout_sessions
      .where('status')
      .equals('IN_PROGRESS')
      .toArray();
    const current = existing.find((s) => s.workout_id === workout.id);
    if (current) {
      this.activeSession.set(current);
      this.state.set('IN_PROGRESS');
      return;
    }

    const now = Date.now();
    const newSession: WorkoutSession = {
      id: uuidv4(),
      workout_id: workout.id,
      started_at: now,
      status: 'IN_PROGRESS',
      finished_at: undefined,
      notes: '',
    };

    await db.workout_sessions.add(newSession);
    this.activeSession.set(newSession);
    this.state.set('IN_PROGRESS');
  }

  /**
   * Log a new set immediately to the DB.
   */
  public async logSet(data: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    rpe?: number;
  }): Promise<void> {
    const session = this.activeSession();
    if (!session) return;

    await this.dbService.initialize();

    const newLog: SetLog = {
      id: uuidv4(),
      session_id: session.id,
      exercise_id: data.exercise_id,
      set_number: data.set_number,
      reps: clampToRange(Number(data.reps), LOG_REPS_RANGE),
      weight: clampToRange(Number(data.weight), WEIGHT_RANGE),
      rpe:
        data.rpe === undefined
          ? undefined
          : clampToRange(Number(data.rpe), RPE_RANGE),
      completed_at: Date.now(),
    };

    try {
      await this.dbService.db.set_logs.add(newLog);
      this.setLogs.update((logs) => [...logs, newLog]);
      this.haptics.light();
    } catch (error) {
      console.error('Failed to log set:', error);
      throw error;
    }
  }

  /**
   * Update an existing set.
   */
  public async updateSet(log: SetLog): Promise<void> {
    try {
      await this.dbService.initialize();
      await this.dbService.db.set_logs.update(log.id, {
        reps: clampToRange(Number(log.reps), LOG_REPS_RANGE),
        weight: clampToRange(Number(log.weight), WEIGHT_RANGE),
        rpe:
          log.rpe === undefined
            ? undefined
            : clampToRange(Number(log.rpe), RPE_RANGE),
      });

      this.setLogs.update((logs) =>
        logs.map((l) => (l.id === log.id ? log : l)),
      );
      this.haptics.light();
    } catch (error) {
      console.error('Failed to update set:', error);
      throw error;
    }
  }

  /**
   * Delete a set log.
   */
  public async deleteSet(setId: string): Promise<void> {
    try {
      await this.dbService.initialize();
      await this.dbService.db.set_logs.delete(setId);
      this.setLogs.update((logs) => logs.filter((l) => l.id !== setId));
      this.haptics.medium();
    } catch (error) {
      console.error('Failed to delete set:', error);
      throw error;
    }
  }

  public requestFinish(): void {
    this.state.set('FINISHING');
  }

  public resumeSession(): void {
    this.state.set('IN_PROGRESS');
  }

  /**
   * Finalize the session, save notes, and update finished_at.
   */
  public async finishSession(notes?: string): Promise<void> {
    const session = this.activeSession();
    if (!session) return;

    try {
      await this.dbService.initialize();
      await this.dbService.db.workout_sessions.update(session.id, {
        finished_at: Date.now(),
        status: 'COMPLETED',
        notes: notes || undefined,
      });
      this.state.set('COMPLETED');
      this.activeSession.set(null);
      this.haptics.doubleTap();
    } catch (error) {
      console.error('Failed to finish session:', error);
      throw error;
    }
  }

  /**
   * Cancel the session and discard its logs.
   * State is always reset, even when the DB cleanup fails.
   */
  public async cancelSession(): Promise<void> {
    const session = this.activeSession();

    try {
      if (session) {
        await this.dbService.initialize();
        const db = this.dbService.db;
        await db.transaction(
          'rw',
          [db.set_logs, db.workout_sessions],
          async () => {
            await db.set_logs.where('session_id').equals(session.id).delete();
            await db.workout_sessions.delete(session.id);
          },
        );
      }
    } finally {
      this.resetState();
    }
  }

  private resetState(): void {
    this.state.set('PREPARING');
    this.workout.set(null);
    this.exercises.set([]);
    this.activeSession.set(null);
    this.setLogs.set([]);
  }
}
