import { db } from '@core/services/app-db';
import {
  buildExercise,
  buildSession,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(SessionService);
  });

  describe('initialize', () => {
    it('returns false for unknown workouts', async () => {
      const found = await service.initialize('missing');

      expect(found).toBe(false);
      expect(service.state()).toBe('PREPARING');
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

      const found = await service.initialize(workout.id);

      expect(found).toBe(true);
      expect(service.state()).toBe('PREPARING');
      expect(service.workout()?.id).toBe(workout.id);
      expect(service.exercises()).toHaveLength(1);
      expect(service.exercises()[0].exercise_name).toBe('Bench Press');
    });
  });

  describe('startSession', () => {
    it('creates an IN_PROGRESS session', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await service.initialize(workout.id);

      await service.startSession();

      expect(service.state()).toBe('IN_PROGRESS');
      const sessions = await db.workout_sessions.toArray();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('IN_PROGRESS');
      expect(sessions[0].workout_id).toBe(workout.id);
    });

    it('never creates a second active session for the same workout', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await service.initialize(workout.id);

      await service.startSession();
      await service.startSession();

      const sessions = await db.workout_sessions.toArray();
      expect(sessions).toHaveLength(1);
    });
  });

  describe('set logging', () => {
    it('logs a set and exposes it in the setLogs signal', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await service.initialize(workout.id);
      await service.startSession();

      await service.logSet({
        exercise_id: 'ex-1',
        set_number: 1,
        reps: 10,
        weight: 50,
      });

      expect(service.setLogs()).toHaveLength(1);
      expect(await db.set_logs.toArray()).toHaveLength(1);
    });

    it('updates and deletes set logs', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await service.initialize(workout.id);
      await service.startSession();
      await service.logSet({
        exercise_id: 'ex-1',
        set_number: 1,
        reps: 10,
        weight: 50,
      });
      const log = service.setLogs()[0];

      await service.updateSet({ ...log, reps: 8, weight: 55 });
      expect(service.setLogs()[0].reps).toBe(8);
      expect(service.setLogs()[0].weight).toBe(55);

      await service.deleteSet(log.id);
      expect(service.setLogs()).toHaveLength(0);
      expect(await db.set_logs.toArray()).toHaveLength(0);
    });
  });

  describe('finishSession', () => {
    it('marks the session COMPLETED and clears active state', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      await service.initialize(workout.id);
      await service.startSession();

      await service.finishSession('Felt strong');

      expect(service.state()).toBe('COMPLETED');
      expect(service.activeSession()).toBeNull();
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
      await service.initialize(workout.id);
      await service.startSession();
      await service.logSet({
        exercise_id: 'ex-1',
        set_number: 1,
        reps: 10,
        weight: 50,
      });

      await service.cancelSession();

      expect(await db.workout_sessions.toArray()).toHaveLength(0);
      expect(await db.set_logs.toArray()).toHaveLength(0);
      expect(service.activeSession()).toBeNull();
      expect(service.setLogs()).toHaveLength(0);
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

      await service.checkActiveSession();

      expect(service.activeSession()?.id).toBe(abandoned.id);
      expect(service.workout()?.id).toBe(workout.id);
    });
  });
});
