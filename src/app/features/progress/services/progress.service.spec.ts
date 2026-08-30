import { db } from '@core/services/app-db';
import {
  buildExercise,
  buildSession,
  buildSetLog,
  buildWorkout,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(ProgressService);
  });

  describe('getWorkoutStats', () => {
    it('returns zeros when there are no completed sessions', async () => {
      const stats = await service.getWorkoutStats();

      expect(stats.totalWorkouts).toBe(0);
      expect(stats.totalVolume).toBe(0);
      expect(stats.lastWorkoutDate).toBeNull();
    });

    it('ignores in-progress sessions', async () => {
      await db.workout_sessions.add(buildSession({ status: 'IN_PROGRESS' }));

      const stats = await service.getWorkoutStats();

      expect(stats.totalWorkouts).toBe(0);
    });

    it('computes volume, count and last workout date', async () => {
      const now = Date.now();
      const session = buildSession({ started_at: now });
      await db.workout_sessions.add(session);
      await db.set_logs.bulkAdd([
        buildSetLog({ session_id: session.id, reps: 10, weight: 50 }),
        buildSetLog({
          session_id: session.id,
          reps: 5,
          weight: 60,
          set_number: 2,
        }),
      ]);

      const stats = await service.getWorkoutStats();

      expect(stats.totalWorkouts).toBe(1);
      expect(stats.totalVolume).toBe(50 * 10 + 60 * 5);
      expect(stats.lastWorkoutDate).toBe(now);
      expect(stats.currentStreak).toBe(1);
    });
  });

  describe('getFrequentWorkouts', () => {
    it('counts sessions per workout and respects the limit', async () => {
      const w1 = buildWorkout({ name: 'A' });
      const w2 = buildWorkout({ name: 'B' });
      const w3 = buildWorkout({ name: 'C' });
      await db.workouts.bulkAdd([w1, w2, w3]);
      await db.workout_sessions.bulkAdd([
        buildSession({ workout_id: w1.id, started_at: 1000 }),
        buildSession({ workout_id: w1.id, started_at: 2000 }),
        buildSession({ workout_id: w1.id, started_at: 3000 }),
        buildSession({ workout_id: w2.id, started_at: 1500 }),
        buildSession({ workout_id: w3.id, started_at: 1200 }),
      ]);

      const result = await service.getFrequentWorkouts(2);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
      expect(result[0].count).toBe(3);
      expect(result[0].lastWorkout).toBe(3000);
      expect(result[1].name).toBe('B');
    });
  });

  describe('getExercisePRs', () => {
    it('returns the max weight per exercise sorted desc', async () => {
      const ex1 = buildExercise({ name: 'Row' });
      const ex2 = buildExercise({ name: 'Curl' });
      const session = buildSession();
      await db.exercises.bulkAdd([ex1, ex2]);
      await db.workout_sessions.add(session);
      await db.set_logs.bulkAdd([
        buildSetLog({
          session_id: session.id,
          exercise_id: ex1.id,
          weight: 80,
        }),
        buildSetLog({
          session_id: session.id,
          exercise_id: ex1.id,
          weight: 90,
          set_number: 2,
        }),
        buildSetLog({
          session_id: session.id,
          exercise_id: ex2.id,
          weight: 20,
        }),
      ]);

      const prs = await service.getExercisePRs();

      expect(prs).toHaveLength(2);
      expect(prs[0].exerciseId).toBe(ex1.id);
      expect(prs[0].prWeight).toBe(90);
      expect(prs[1].prWeight).toBe(20);
    });

    it('ignores zero-weight logs', async () => {
      const ex1 = buildExercise();
      const session = buildSession();
      await db.exercises.add(ex1);
      await db.workout_sessions.add(session);
      await db.set_logs.add(
        buildSetLog({ session_id: session.id, exercise_id: ex1.id, weight: 0 }),
      );

      const prs = await service.getExercisePRs();

      expect(prs).toHaveLength(0);
    });
  });

  describe('getMuscleDistribution', () => {
    it('computes percentages per workout muscle group', async () => {
      const w1 = buildWorkout({ muscle_group: 'chest' });
      const w2 = buildWorkout({ muscle_group: 'back' });
      const w3 = buildWorkout({ muscle_group: 'chest' });
      await db.workouts.bulkAdd([w1, w2, w3]);
      await db.workout_sessions.bulkAdd([
        buildSession({ workout_id: w1.id }),
        buildSession({ workout_id: w2.id }),
        buildSession({ workout_id: w3.id }),
      ]);

      const distribution = await service.getMuscleDistribution();

      const chest = distribution.find((d) => d.muscleGroup === 'chest');
      const back = distribution.find((d) => d.muscleGroup === 'back');
      expect(chest).toEqual({
        muscleGroup: 'chest',
        count: 2,
        percentage: 67,
      });
      expect(back).toEqual({
        muscleGroup: 'back',
        count: 1,
        percentage: 33,
      });
    });
  });
});
