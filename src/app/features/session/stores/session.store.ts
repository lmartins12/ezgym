import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { SessionRepository } from '@domain/sessions/session.repository';
import type { SetLog } from '@domain/sessions/set-log';
import type { WorkoutSession } from '@domain/sessions/workout-session';
import {
  clampToRange,
  LOG_REPS_RANGE,
  RPE_RANGE,
  WEIGHT_RANGE,
} from '@domain/shared/limits';
import type { Workout } from '@domain/workouts/workout';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import { v4 as uuidv4 } from 'uuid';

export type SessionPhase =
  'PREPARING' | 'IN_PROGRESS' | 'FINISHING' | 'COMPLETED';

interface SessionStateModel {
  state: SessionPhase;
  workout: Workout | null;
  exercises: WorkoutExercise[];
  activeSession: WorkoutSession | null;
  setLogs: SetLog[];
}

const initialState: SessionStateModel = {
  state: 'PREPARING',
  workout: null,
  exercises: [],
  activeSession: null,
  setLogs: [],
};

/**
 * Root-singleton session store: an in-progress workout must survive
 * tab switches, so the state intentionally outlives the session route.
 * Navigation decisions belong to SessionPage, not here. Persistence
 * lives in the session/workout/exercise repositories — this store
 * keeps live state only.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ state }) => ({
    isSessionActive: computed(
      () => state() === 'IN_PROGRESS' || state() === 'FINISHING',
    ),
  })),
  withMethods((store) => {
    const sessionRepository = inject(SessionRepository);
    const workoutRepository = inject(WorkoutRepository);

    return {
      /**
       * Initialize for Dashboard: Check for ANY active session.
       */
      async checkActiveSession(): Promise<void> {
        patchState(store, initialState);
        const existingSession = await sessionRepository.getMostRecentActive();

        if (existingSession) {
          const workout = await workoutRepository.getById(
            existingSession.workout_id,
          );
          patchState(store, {
            workout,
            activeSession: existingSession,
          });
        }
      },

      /**
       * Initialize the session view for a workout.
       * Recovers an abandoned active session for the same workout when one
       * exists, otherwise prepares a fresh PREPARING state.
       * @returns false when the workout does not exist (caller navigates).
       */
      async initialize(workoutId: string): Promise<boolean> {
        patchState(store, initialState);

        // 0. Check for Abandoned Session (Recovery)
        const existingSession = await sessionRepository.getMostRecentActive();

        if (existingSession && existingSession.workout_id === workoutId) {
          const workout = await workoutRepository.getById(workoutId);
          const exercises =
            await workoutRepository.getDetailedWorkoutExercises(workoutId);
          const logs = await sessionRepository.getLogsBySession(
            existingSession.id,
          );

          patchState(store, {
            workout,
            exercises,
            setLogs: logs,
            activeSession: existingSession,
            state: 'IN_PROGRESS',
          });
          return true;
        }

        // 1. Load Workout Details (Normal Flow)
        const workout = await workoutRepository.getById(workoutId);
        if (!workout) {
          return false;
        }

        const exercises =
          await workoutRepository.getDetailedWorkoutExercises(workoutId);

        patchState(store, { workout, exercises, state: 'PREPARING' });
        return true;
      },

      /**
       * Start the workout execution.
       * Creates the session record in DB, or adopts the existing active
       * session for this workout (e.g. double tap / race with recovery).
       */
      async startSession(): Promise<void> {
        const workout = store.workout();
        if (!workout) return;

        // Guard: never create a second active session for the same workout
        const current = await sessionRepository.getActiveByWorkoutId(
          workout.id,
        );
        if (current) {
          patchState(store, { activeSession: current, state: 'IN_PROGRESS' });
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

        await sessionRepository.add(newSession);
        patchState(store, { activeSession: newSession, state: 'IN_PROGRESS' });
      },

      /**
       * Log a new set immediately to the DB.
       */
      async logSet(data: {
        exercise_id: string;
        set_number: number;
        reps: number;
        weight: number;
        rpe?: number;
      }): Promise<void> {
        const session = store.activeSession();
        if (!session) return;

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

        await sessionRepository.addLog(newLog);
        patchState(store, (state) => ({
          setLogs: [...state.setLogs, newLog],
        }));
      },

      /**
       * Update an existing set.
       */
      async updateSet(log: SetLog): Promise<void> {
        await sessionRepository.updateLog(log.id, {
          reps: clampToRange(Number(log.reps), LOG_REPS_RANGE),
          weight: clampToRange(Number(log.weight), WEIGHT_RANGE),
          rpe:
            log.rpe === undefined
              ? undefined
              : clampToRange(Number(log.rpe), RPE_RANGE),
        });

        patchState(store, (state) => ({
          setLogs: state.setLogs.map((l) => (l.id === log.id ? log : l)),
        }));
      },

      /**
       * Delete a set log.
       */
      async deleteSet(setId: string): Promise<void> {
        await sessionRepository.deleteLog(setId);
        patchState(store, (state) => ({
          setLogs: state.setLogs.filter((l) => l.id !== setId),
        }));
      },

      requestFinish(): void {
        patchState(store, { state: 'FINISHING' });
      },

      resumeSession(): void {
        patchState(store, { state: 'IN_PROGRESS' });
      },

      /**
       * Finalize the session, save notes, and update finished_at.
       */
      async finishSession(notes?: string): Promise<void> {
        const session = store.activeSession();
        if (!session) return;

        await sessionRepository.update(session.id, {
          finished_at: Date.now(),
          status: 'COMPLETED',
          notes: notes || undefined,
        });
        patchState(store, { state: 'COMPLETED', activeSession: null });
      },

      /**
       * Cancel the session and discard its logs.
       * State is always reset, even when the DB cleanup fails.
       */
      async cancelSession(): Promise<void> {
        const session = store.activeSession();

        try {
          if (session) {
            await sessionRepository.deleteWithLogs(session.id);
          }
        } finally {
          patchState(store, initialState);
        }
      },
    };
  }),
);
