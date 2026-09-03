import { db } from '@core/db/app-db';
import {
  buildSession,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { WorkoutsQuery } from './workouts.query';

describe('WorkoutsQuery', () => {
  let query: WorkoutsQuery;

  beforeEach(async () => {
    await resetDatabase();
    query = injectService(WorkoutsQuery);
  });

  it('returns empty when there are no workouts', async () => {
    await expect(query.list()).resolves.toEqual([]);
  });

  it('enriches workouts with counts and last-trained, sorted by order', async () => {
    const w1 = buildWorkout({
      name: 'B',
      order_index: 1,
      updated_at: 1000,
    });
    const w2 = buildWorkout({
      name: 'A',
      order_index: 0,
      updated_at: 500,
    });
    await db.workouts.bulkAdd([w1, w2]);
    await db.workout_exercises.bulkAdd([
      buildWorkoutExercise({ workout_id: w1.id, order_index: 0 }),
      buildWorkoutExercise({ workout_id: w1.id, order_index: 1 }),
    ]);
    await db.workout_sessions.bulkAdd([
      buildSession({ workout_id: w1.id, started_at: 2000 }),
      buildSession({ workout_id: w1.id, started_at: 3000 }),
    ]);

    const result = await query.list();

    expect(result.map((w) => w.id)).toEqual([w2.id, w1.id]);
    const first = result.find((w) => w.id === w1.id);
    expect(first?.exercise_count).toBe(2);
    expect(first?.last_trained).toBe(3000);
    const second = result.find((w) => w.id === w2.id);
    expect(second?.exercise_count).toBe(0);
    expect(second?.last_trained).toBeUndefined();
  });

  it('breaks order ties by updated_at desc', async () => {
    const older = buildWorkout({ order_index: 0, updated_at: 1000 });
    const newer = buildWorkout({ order_index: 0, updated_at: 2000 });
    await db.workouts.bulkAdd([older, newer]);

    const result = await query.list();

    expect(result.map((w) => w.id)).toEqual([newer.id, older.id]);
  });
});
