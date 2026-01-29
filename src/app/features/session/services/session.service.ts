import { computed, inject, Injectable, signal } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  DatabaseService,
  type SetLog,
  type Workout,
  type WorkoutExercise,
  type WorkoutSession,
} from '@core';
import { NavController } from '@ionic/angular/standalone';
import { v4 as uuidv4 } from 'uuid';

export type SessionState =
  | 'PREPARING'
  | 'IN_PROGRESS'
  | 'FINISHING'
  | 'COMPLETED';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly db = inject(DatabaseService);
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
   * Initialize for Dashboard: Check for ANY active session.
   */
  public async checkActiveSession(): Promise<void> {
    this.resetState();
    await this.db.ready();

    const activeSessions = await this.db.query<WorkoutSession>(
      `SELECT * FROM workout_sessions WHERE status = 'IN_PROGRESS'`,
    );

    if (activeSessions.length > 0) {
      const existingSession = activeSessions[0];
      // Load workout definition for the active session so we can display its name
      const workouts = await this.db.query<Workout>(
        'SELECT * FROM workouts WHERE id = ?',
        [existingSession.workout_id],
      );
      this.workout.set(workouts[0]);

      // We don't necessarily load exercises/logs yet unless the user clicks Resume
      // But for simple "Resume" logic, we might as well load them if we want to seamlessly transition.
      // For now, just setting the active session allows the UI to show "Resume [Workout Name]"
      this.activeSession.set(existingSession);
    }
  }

  /**
   * Initialize the session view (Preparing state)
   * Loads workout details but does NOT create a session in DB yet.
   */
  public async initialize(workoutId: string): Promise<void> {
    this.resetState();
    await this.db.ready();

    // 0. Check for Abandoned Session (Recovery)
    const activeSessions = await this.db.query<WorkoutSession>(
      `SELECT * FROM workout_sessions WHERE status = 'IN_PROGRESS'`,
    );

    if (activeSessions.length > 0) {
      const existingSession = activeSessions[0];
      // If the active session matches the requested workout, RESUME IT
      if (existingSession.workout_id === workoutId) {
        // Load workout details (needed for display)
        const workouts = await this.db.query<Workout>(
          'SELECT * FROM workouts WHERE id = ?',
          [workoutId],
        );
        this.workout.set(workouts[0]);

        // Load Exercises
        const exercises = await this.db.query<WorkoutExercise>(
          `SELECT we.*, e.name as exercise_name, e.muscle_group 
           FROM workout_exercises we
           JOIN exercises e ON we.exercise_id = e.id
           WHERE we.workout_id = ?
           ORDER BY we.order_index ASC`,
          [workoutId],
        );
        this.exercises.set(exercises);

        // Load Logs for this session
        const logs = await this.db.query<SetLog>(
          'SELECT * FROM set_logs WHERE session_id = ?',
          [existingSession.id],
        );
        this.setLogs.set(logs);

        // Set state to IN_PROGRESS
        this.activeSession.set(existingSession);
        this.state.set('IN_PROGRESS');
        return;
      } else {
        // If there's an active session for ANOTHER workout, we currently ignore it
        // and let the user start this new one. (Future: Prompt to discard/resume)
        console.warn(
          'Found active session for another workout:',
          existingSession.workout_id,
        );
      }
    }

    // 1. Load Workout Details (Normal Flow)
    const workouts = await this.db.query<Workout>(
      'SELECT * FROM workouts WHERE id = ?',
      [workoutId],
    );
    const workout = workouts[0];

    if (!workout) {
      console.error('Workout not found');
      this.navCtrl.navigateBack('/tabs/workouts');
      return;
    }

    this.workout.set(workout);

    // 2. Load Exercises
    const exercises = await this.db.query<WorkoutExercise>(
      `SELECT we.*, e.name as exercise_name, e.muscle_group 
       FROM workout_exercises we
       JOIN exercises e ON we.exercise_id = e.id
       WHERE we.workout_id = ?
       ORDER BY we.order_index ASC`,
      [workoutId],
    );

    this.exercises.set(exercises);
    this.state.set('PREPARING');
  }

  /**
   * Start the workout execution.
   * Creates the session record in DB.
   */
  public async startSession(): Promise<void> {
    const workout = this.workout();
    if (!workout) return;

    const sessionId = uuidv4();
    const now = Date.now();

    const newSession: WorkoutSession = {
      id: sessionId,
      workout_id: workout.id,
      started_at: now,
      finished_at: undefined,
      notes: '',
    };

    // Persist to DB
    await this.db.execute(
      `INSERT INTO workout_sessions (id, workout_id, started_at) VALUES (?, ?, ?)`,
      [newSession.id, newSession.workout_id, newSession.started_at],
    );

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

    const newLog: SetLog = {
      id: uuidv4(),
      session_id: session.id, // Changed from workout_session_id to session_id to match type
      exercise_id: data.exercise_id,
      set_number: data.set_number,
      reps: data.reps,
      weight: data.weight,
      rpe: data.rpe,
      completed_at: Date.now(),
    };

    try {
      await this.db.execute(
        `INSERT INTO set_logs (id, session_id, exercise_id, set_number, reps, weight, rpe, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newLog.id,
          newLog.session_id,
          newLog.exercise_id,
          newLog.set_number,
          newLog.reps,
          newLog.weight,
          newLog.rpe ?? null,
          newLog.completed_at,
        ],
      );
      this.setLogs.update((logs) => [...logs, newLog]);
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Failed to log set:', error);
    }
  }

  /**
   * Delete a set log.
   */
  async updateSet(log: SetLog) {
    try {
      await this.db.execute(
        `UPDATE set_logs SET reps = ?, weight = ?, rpe = ? WHERE id = ?`,
        [log.reps, log.weight, log.rpe ?? null, log.id],
      );

      this.setLogs.update((logs) =>
        logs.map((l) => (l.id === log.id ? log : l)),
      );
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('Failed to update set:', error);
    }
  }

  async deleteSet(setId: string) {
    try {
      await this.db.execute('DELETE FROM set_logs WHERE id = ?', [setId]);
      this.setLogs.update((logs) => logs.filter((l) => l.id !== setId));
      Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.error('Failed to delete set:', error);
    }
  }

  /**
   * Transition to FINISHING state (User wants to end).
   */
  public requestFinish(): void {
    this.state.set('FINISHING');
  }

  /**
   * Go back to IN_PROGRESS from FINISHING.
   */
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
      await this.db.execute(
        'UPDATE workout_sessions SET finished_at = ?, status = ?, notes = ? WHERE id = ?',
        [Date.now(), 'COMPLETED', notes ?? null, session.id],
      );
      this.state.set('COMPLETED');
      this.activeSession.set(null);
      Haptics.vibrate();
      this.navCtrl.navigateBack('/tabs/workouts');
    } catch (error) {
      console.error('Failed to finish session:', error);
    }
  }

  /**
   * Cancel the session (from PREPARING or IN_PROGRESS).
   * If IN_PROGRESS, might need to delete the session or mark as abandoned?
   * For MVP: if PREPARING, just go back. If IN_PROGRESS, allow discard.
   */
  public async cancelSession(): Promise<void> {
    const session = this.activeSession();

    if (session) {
      // If we want to fully delete the session on cancel:
      await this.db.execute('DELETE FROM set_logs WHERE session_id = ?', [
        session.id,
      ]);
      await this.db.execute('DELETE FROM workout_sessions WHERE id = ?', [
        session.id,
      ]);
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
