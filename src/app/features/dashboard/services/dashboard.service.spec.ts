import { db } from '@core/services/app-db';
import {
  buildExercise,
  buildSession,
  buildSetLog,
  buildWorkout,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { DashboardService } from './dashboard.service';

const DAY = 24 * 60 * 60 * 1000;

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(DashboardService);
  });

  describe('getWorkoutSessions', () => {
    it('returns pages sorted by most recent first', async () => {
      const now = Date.now();
      await db.workouts.bulkAdd([buildWorkout()]);
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: now - 2 * DAY }),
        buildSession({ started_at: now - DAY }),
        buildSession({ started_at: now }),
      ]);

      const page = await service.getWorkoutSessions(null, null, 0, 2);

      expect(page).toHaveLength(2);
      expect(page[0].started_at).toBeGreaterThan(page[1].started_at);
    });

    it('applies date-range filters and offset', async () => {
      const now = Date.now();
      await db.workouts.bulkAdd([buildWorkout()]);
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: now - 10 * DAY }),
        buildSession({ started_at: now - DAY }),
        buildSession({ started_at: now }),
      ]);

      const filtered = await service.getWorkoutSessions(
        now - 2 * DAY,
        now,
        0,
        10,
      );
      expect(filtered).toHaveLength(2);

      const offsetPage = await service.getWorkoutSessions(
        now - 2 * DAY,
        now,
        1,
        10,
      );
      expect(offsetPage).toHaveLength(1);
    });

    it('joins workout name and muscle group', async () => {
      const workout = buildWorkout({ name: 'Pull Day', muscle_group: 'back' });
      await db.workouts.add(workout);
      await db.workout_sessions.add(buildSession({ workout_id: workout.id }));

      const [row] = await service.getWorkoutSessions(null, null, 0, 10);

      expect(row?.workout_name).toBe('Pull Day');
      expect(row?.muscle_group).toBe('back');
    });
  });

  describe('getWorkoutSessionsCount', () => {
    it('counts sessions within the date range', async () => {
      const now = Date.now();
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: now - 10 * DAY }),
        buildSession({ started_at: now - DAY }),
        buildSession({ started_at: now }),
      ]);

      const count = await service.getWorkoutSessionsCount(now - 2 * DAY, now);
      expect(count).toBe(2);
    });
  });

  describe('getDatesWithEvents', () => {
    it('returns unique timestamps within the month range', async () => {
      const now = Date.now();
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: now }),
        buildSession({ started_at: now }),
        buildSession({ started_at: now - 10 * DAY }),
      ]);

      const dates = await service.getDatesWithEvents(now - 2 * DAY, now);

      expect(dates).toEqual([now]);
    });
  });

  describe('getAllDatesWithEvents', () => {
    it('returns every unique session date', async () => {
      const now = Date.now();
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: now }),
        buildSession({ started_at: now - 40 * DAY }),
        buildSession({ started_at: now }),
      ]);

      const dates = await service.getAllDatesWithEvents();

      expect(dates).toHaveLength(2);
    });
  });

  describe('getSessionDetail', () => {
    it('groups set logs by exercise with joined metadata', async () => {
      const workout = buildWorkout();
      const ex1 = buildExercise({ name: 'Row' });
      const ex2 = buildExercise({ name: 'Curl', muscle_group: 'biceps' });
      const session = buildSession({ workout_id: workout.id });
      await db.workouts.add(workout);
      await db.exercises.bulkAdd([ex1, ex2]);
      await db.workout_sessions.add(session);
      await db.set_logs.bulkAdd([
        buildSetLog({
          session_id: session.id,
          exercise_id: ex1.id,
          set_number: 1,
        }),
        buildSetLog({
          session_id: session.id,
          exercise_id: ex1.id,
          set_number: 2,
        }),
        buildSetLog({
          session_id: session.id,
          exercise_id: ex2.id,
          set_number: 1,
        }),
      ]);

      const detail = await service.getSessionDetail(session.id);

      expect(detail.workoutName).toBe(workout.name);
      expect(detail.exercises).toHaveLength(2);
      const row = detail.exercises.find((e) => e.id === ex1.id);
      expect(row?.sets).toHaveLength(2);
      expect(row?.sets[0].setNumber).toBe(1);
    });

    it('throws for unknown session ids', async () => {
      await expect(service.getSessionDetail('missing')).rejects.toThrow();
    });
  });
});
