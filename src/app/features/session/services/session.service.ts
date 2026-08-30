import { computed, inject, Injectable, signal } from '@angular/core';
import { DatabaseService } from '@core/services/database.service';
import type {
  SetLog,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '@core/models/app-models';
import { NavController } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';

export type SessionState =
  'PREPARING' | 'IN_PROGRESS' | 'FINISHING' | 'COMPLETED';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly dbService = inject(DatabaseService);
  private readonly navCtrl = inject(NavController);

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
   * Helper for vibration feedback (Web Vibration API)
   */
  private triggerHaptic(intensity: 'light' | 'medium' = 'light'): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(intensity === 'medium' ? 60 : 35);
      } catch {
        // Ignore if blocked by browser policy
      }
    }
  }

  private triggerVibrate(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Initialize for Dashboard: Check for ANY active session.
   */
  public async checkActiveSession(): Promise<void> {
    this.resetState();
    await this.dbService.initialize();
    const db = this.dbService.db;

    const activeSessions = await db.workout_sessions
      .where('status')
      .equals('IN_PROGRESS')
      .toArray();

    if (activeSessions.length > 0) {
      const existingSession = activeSessions[0];
      const workout = await db.workouts.get(existingSession.workout_id);
      this.workout.set(workout ?? null);
      this.activeSession.set(existingSession);
    }
  }

  /**
   * Initialize the session view (Preparing state)
   * Loads workout details but does NOT create a session in DB yet.
   */
  public async initialize(workoutId: string): Promise<void> {
    this.resetState();
    await this.dbService.initialize();
    const db = this.dbService.db;

    // 0. Check for Abandoned Session (Recovery)
    const activeSessions = await db.workout_sessions
      .where('status')
      .equals('IN_PROGRESS')
      .toArray();

    if (activeSessions.length > 0) {
      const existingSession = activeSessions[0];
      if (existingSession.workout_id === workoutId) {
        const workout = await db.workouts.get(workoutId);
        this.workout.set(workout ?? null);

        // Load Exercises with joined info
        const workoutExercises = await db.workout_exercises
          .where('workout_id')
          .equals(workoutId)
          .toArray();

        const exerciseIds = workoutExercises.map((we) => we.exercise_id);
        const exercises = await db.exercises
          .where('id')
          .anyOf(exerciseIds)
          .toArray();
        const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

        const detailedExercises: WorkoutExercise[] = workoutExercises
          .map((we) => ({
            ...we,
            exercise_name: exerciseMap.get(we.exercise_id)?.name,
            muscle_group: exerciseMap.get(we.exercise_id)?.muscle_group,
          }))
          .sort((a, b) => a.order_index - b.order_index);

        this.exercises.set(detailedExercises);

        // Load Logs for this session
        const logs = await db.set_logs
          .where('session_id')
          .equals(existingSession.id)
          .toArray();

        this.setLogs.set(logs.sort((a, b) => a.set_number - b.set_number));
        this.activeSession.set(existingSession);
        this.state.set('IN_PROGRESS');
        return;
      }
    }

    // 1. Load Workout Details (Normal Flow)
    const workout = await db.workouts.get(workoutId);

    if (!workout) {
      console.error('Workout not found');
      this.navCtrl.navigateBack('/tabs/workouts');
      return;
    }

    this.workout.set(workout);

    // 2. Load Exercises
    const workoutExercises = await db.workout_exercises
      .where('workout_id')
      .equals(workoutId)
      .toArray();

    const exerciseIds = workoutExercises.map((we) => we.exercise_id);
    const exercises = await db.exercises
      .where('id')
      .anyOf(exerciseIds)
      .toArray();
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    const detailedExercises: WorkoutExercise[] = workoutExercises
      .map((we) => ({
        ...we,
        exercise_name: exerciseMap.get(we.exercise_id)?.name,
        muscle_group: exerciseMap.get(we.exercise_id)?.muscle_group,
      }))
      .sort((a, b) => a.order_index - b.order_index);

    this.exercises.set(detailedExercises);
    this.state.set('PREPARING');
  }

  /**
   * Start the workout execution.
   * Creates the session record in DB.
   */
  public async startSession(): Promise<void> {
    const workout = this.workout();
    if (!workout) return;

    await this.dbService.initialize();
    const sessionId = uuidv4();
    const now = Date.now();

    const newSession: WorkoutSession = {
      id: sessionId,
      workout_id: workout.id,
      started_at: now,
      status: 'IN_PROGRESS',
      finished_at: undefined,
      notes: '',
    };

    await this.dbService.db.workout_sessions.add(newSession);
    this.activeSession.set(newSession);
    this.state.set('IN_PROGRESS');
  }

  /**
   * Log a new set immediately to the DB.
   */
  async logSet(data: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    rpe?: number;
  }) {
    const session = this.activeSession();
    if (!session) return;

    await this.dbService.initialize();

    const newLog: SetLog = {
      id: uuidv4(),
      session_id: session.id,
      exercise_id: data.exercise_id,
      set_number: data.set_number,
      reps: data.reps,
      weight: data.weight,
      rpe: data.rpe ?? undefined,
      completed_at: Date.now(),
    };

    try {
      await this.dbService.db.set_logs.add(newLog);
      this.setLogs.update((logs) => [...logs, newLog]);
      this.triggerHaptic('light');
    } catch (error) {
      console.error('Failed to log set:', error);
    }
  }

  /**
   * Update an existing set.
   */
  async updateSet(log: SetLog) {
    try {
      await this.dbService.initialize();
      await this.dbService.db.set_logs.update(log.id, {
        reps: log.reps,
        weight: log.weight,
        rpe: log.rpe ?? undefined,
      });

      this.setLogs.update((logs) =>
        logs.map((l) => (l.id === log.id ? log : l)),
      );
      this.triggerHaptic('light');
    } catch (error) {
      console.error('Failed to update set:', error);
    }
  }

  /**
   * Delete a set log.
   */
  async deleteSet(setId: string) {
    try {
      await this.dbService.initialize();
      await this.dbService.db.set_logs.delete(setId);
      this.setLogs.update((logs) => logs.filter((l) => l.id !== setId));
      this.triggerHaptic('medium');
    } catch (error) {
      console.error('Failed to delete set:', error);
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
  async finishSession(notes?: string) {
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
      this.triggerVibrate();
      this.navCtrl.navigateBack('/tabs/workouts');
    } catch (error) {
      console.error('Failed to finish session:', error);
    }
  }

  public async cancelSession(): Promise<void> {
    const session = this.activeSession();

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

    this.resetState();
    this.navCtrl.navigateBack('/tabs/workouts');
  }

  private resetState(): void {
    this.state.set('PREPARING');
    this.workout.set(null);
    this.exercises.set([]);
    this.activeSession.set(null);
    this.setLogs.set([]);
  }
}
