import { TestBed } from '@angular/core/testing';
import { db } from '@core/db/app-db';
import {
  buildExercise,
  buildSession,
  buildWorkout,
  buildWorkoutExercise,
  resetDatabase,
} from '@testing/db-test-helpers';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  let store: InstanceType<typeof SessionStore>;

  beforeEach(async () => {
    await resetDatabase();
    TestBed.configureTestingModule({});
    store = TestBed.inject(SessionStore);
  });

  describe('initialize', () => {
    it('returns false for unknown workouts', async () => {
      const found = await store.initialize('missing');

      expect(found).toBe(false);
      expect(store.state()).toBe('PREPARING');
    });

    it('prepares a fresh session for a known workout', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise();
      await db.workouts.add(workout);
      await db.exercises.add(exercise);
      await db.workout_exercises.add(
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: exercise.id,
        }),
      );

      const found = await store.initialize(workout.id);

      expect(found).toBe(true);
      expect(store.state()).toBe('PREPARING');
      expect(store.workout()?.id).toBe(workout.id);
      expect(store.exercises()).toHaveLength(1);
      expect(store.exercises()[0].exercise_name).toBe('Bench Press');
    });
  });

  describe('startSession', () => {
    it('creates an IN_PROGRESS session', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await store.initialize(workout.id);

      await store.startSession();

      expect(store.state()).toBe('IN_PROGRESS');
      const sessions = await db.workout_sessions.toArray();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('IN_PROGRESS');
      expect(sessions[0].workout_id).toBe(workout.id);
    });

    it('never creates a second active session for the same workout', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await store.initialize(workout.id);

      await store.startSession();
      await store.startSession();

      const sessions = await db.workout_sessions.toArray();
      expect(sessions).toHaveLength(1);
    });
  });

  describe('set logging', () => {
    it('logs a set and exposes it in the setLogs signal', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await store.initialize(workout.id);
      await store.startSession();

      await store.logSet({
        exercise_id: 'ex-1',
        set_number: 1,
        reps: 10,
        weight: 50,
      });

      expect(store.setLogs()).toHaveLength(1);
      expect(await db.set_logs.toArray()).toHaveLength(1);
    });

    it('updates and deletes set logs', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await store.initialize(workout.id);
      await store.startSession();
      await store.logSet({
        exercise_id: 'ex-1',
        set_number: 1,
        reps: 10,
        weight: 50,
      });
      const log = store.setLogs()[0];

      await store.updateSet({ ...log, reps: 8, weight: 55 });
      expect(store.setLogs()[0].reps).toBe(8);
      expect(store.setLogs()[0].weight).toBe(55);

      await store.deleteSet(log.id);
      expect(store.setLogs()).toHaveLength(0);
      expect(await db.set_logs.toArray()).toHaveLength(0);
    });
  });

  describe('finishSession', () => {
    it('marks the session COMPLETED and clears active state', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await store.initialize(workout.id);
      await store.startSession();

      await store.finishSession('Felt strong');

      expect(store.state()).toBe('COMPLETED');
      expect(store.activeSession()).toBeNull();
      const [session] = await db.workout_sessions.toArray();
      expect(session.status).toBe('COMPLETED');
      expect(session.notes).toBe('Felt strong');
      expect(session.finished_at).toBeGreaterThan(0);
    });
  });

  describe('cancelSession', () => {
    it('deletes the session with its logs and resets state', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await store.initialize(workout.id);
      await store.startSession();
      await store.logSet({
        exercise_id: 'ex-1',
        set_number: 1,
        reps: 10,
        weight: 50,
      });

      await store.cancelSession();

      expect(await db.workout_sessions.toArray()).toHaveLength(0);
      expect(await db.set_logs.toArray()).toHaveLength(0);
      expect(store.activeSession()).toBeNull();
      expect(store.setLogs()).toHaveLength(0);
    });
  });

  describe('checkActiveSession', () => {
    it('recovers an abandoned active session', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      const abandoned = buildSession({
        workout_id: workout.id,
        status: 'IN_PROGRESS',
      });
      await db.workout_sessions.add(abandoned);

      await store.checkActiveSession();

      expect(store.activeSession()?.id).toBe(abandoned.id);
      expect(store.workout()?.id).toBe(workout.id);
    });

    it('adopts the most recent session when legacy data has multiple actives', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const workout = buildWorkout();
      await db.workouts.add(workout);
      const older = buildSession({
        workout_id: workout.id,
        status: 'IN_PROGRESS',
        started_at: 1000,
      });
      const newer = buildSession({
        workout_id: workout.id,
        status: 'IN_PROGRESS',
        started_at: 2000,
      });
      await db.workout_sessions.bulkAdd([older, newer]);

      await store.checkActiveSession();

      expect(store.activeSession()?.id).toBe(newer.id);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
