import { db } from '@core/db/app-db';
import {
  buildExercise,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { WorkoutRepository } from './workout.repository';

describe('WorkoutRepository', () => {
  let service: WorkoutRepository;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(WorkoutRepository);
  });

  describe('getDetailedWorkoutExercises', () => {
    it('joins exercise data and sorts by order', async () => {
      const workout = buildWorkout();
      const ex1 = buildExercise({ name: 'Row' });
      const ex2 = buildExercise({ name: 'Curl', muscle_group: 'biceps' });
      await db.workouts.add(workout);
      await db.exercises.bulkAdd([ex1, ex2]);
      await db.workout_exercises.bulkAdd([
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: ex1.id,
          order_index: 1,
        }),
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: ex2.id,
          order_index: 0,
        }),
      ]);

      const detailed = await service.getDetailedWorkoutExercises(workout.id);

      expect(detailed).toHaveLength(2);
      expect(detailed[0].exercise_name).toBe('Curl');
      expect(detailed[0].muscle_group).toBe('biceps');
      expect(detailed[1].exercise_name).toBe('Row');
    });

    it('returns empty for workouts without exercises', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);

      const detailed = await service.getDetailedWorkoutExercises(workout.id);

      expect(detailed).toEqual([]);
    });
  });

  describe('getExerciseCountMap', () => {
    it('counts exercises per workout', async () => {
      const w1 = buildWorkout();
      const w2 = buildWorkout();
      const exercise = buildExercise();
      await db.workouts.bulkAdd([w1, w2]);
      await db.exercises.add(exercise);
      await db.workout_exercises.bulkAdd([
        buildWorkoutExercise({
          workout_id: w1.id,
          exercise_id: exercise.id,
          order_index: 0,
        }),
        buildWorkoutExercise({
          workout_id: w1.id,
          exercise_id: exercise.id,
          order_index: 1,
        }),
        buildWorkoutExercise({
          workout_id: w2.id,
          exercise_id: exercise.id,
          order_index: 0,
        }),
      ]);

      const map = await service.getExerciseCountMap();

      expect(map.get(w1.id)).toBe(2);
      expect(map.get(w2.id)).toBe(1);
    });
  });

  describe('reorder', () => {
    it('persists the new order atomically', async () => {
      const w1 = buildWorkout({ order_index: 0 });
      const w2 = buildWorkout({ order_index: 1 });
      const w3 = buildWorkout({ order_index: 2 });
      await db.workouts.bulkAdd([w1, w2, w3]);

      await service.reorder([w3.id, w1.id, w2.id]);

      const workouts = await db.workouts.orderBy('order_index').toArray();
      expect(workouts.map((w) => w.id)).toEqual([w3.id, w1.id, w2.id]);
    });
  });

  describe('getMaxOrderIndex', () => {
    it('returns -1 when there are no workouts', async () => {
      expect(await service.getMaxOrderIndex()).toBe(-1);
    });

    it('returns the highest order_index', async () => {
      await db.workouts.bulkAdd([
        buildWorkout({ order_index: 1 }),
        buildWorkout({ order_index: 3 }),
      ]);

      expect(await service.getMaxOrderIndex()).toBe(3);
    });
  });
});
