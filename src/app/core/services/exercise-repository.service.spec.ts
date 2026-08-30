import { db } from '@core/services/app-db';
import {
  buildExercise,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { ExerciseRepository } from './exercise-repository.service';

describe('ExerciseRepository', () => {
  let service: ExerciseRepository;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(ExerciseRepository);
  });

  describe('findOrCreate', () => {
    it('creates a new exercise and reports isNew', async () => {
      const { exerciseId, isNew } = await service.findOrCreate({
        name: 'Deadlift',
        muscleGroup: 'back',
      });

      expect(isNew).toBe(true);
      const stored = await db.exercises.get(exerciseId);
      expect(stored?.name).toBe('Deadlift');
      expect(stored?.muscle_group).toBe('back');
    });

    it('finds existing exercises case-insensitively without overwriting', async () => {
      const existing = buildExercise({ name: 'Bench Press' });
      await db.exercises.add(existing);

      const { exerciseId, isNew } = await service.findOrCreate({
        name: '  bench press  ',
        muscleGroup: 'shoulders',
      });

      expect(isNew).toBe(false);
      expect(exerciseId).toBe(existing.id);
      const stored = await db.exercises.get(existing.id);
      expect(stored?.muscle_group).toBe('chest');
    });

    it('overwrites metadata only when requested', async () => {
      const existing = buildExercise({ name: 'Bench Press' });
      await db.exercises.add(existing);

      await service.findOrCreate(
        {
          name: 'Bench Press',
          muscleGroup: 'shoulders',
          equipment: 'Dumbbells',
        },
        { overwriteMetadata: true },
      );

      const stored = await db.exercises.get(existing.id);
      expect(stored?.muscle_group).toBe('shoulders');
      expect(stored?.equipment).toBe('Dumbbells');
    });

    it('keeps the knownExercises map consistent across a batch', async () => {
      const known = await service.getExerciseNameMap();

      const first = await service.findOrCreate(
        { name: 'Squat', muscleGroup: 'quadriceps' },
        { knownExercises: known },
      );
      const second = await service.findOrCreate(
        { name: 'SQUAT', muscleGroup: 'quadriceps' },
        { knownExercises: known },
      );

      expect(first.isNew).toBe(true);
      expect(second.isNew).toBe(false);
      expect(second.exerciseId).toBe(first.exerciseId);
      const all = await db.exercises.toArray();
      expect(all).toHaveLength(1);
    });
  });

  describe('getDetailedByWorkoutId', () => {
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

      const detailed = await service.getDetailedByWorkoutId(workout.id);

      expect(detailed).toHaveLength(2);
      expect(detailed[0].exercise_name).toBe('Curl');
      expect(detailed[0].muscle_group).toBe('biceps');
      expect(detailed[1].exercise_name).toBe('Row');
    });

    it('returns empty for workouts without exercises', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);

      const detailed = await service.getDetailedByWorkoutId(workout.id);

      expect(detailed).toEqual([]);
    });
  });

  describe('getExistingNames', () => {
    it('returns normalized names', async () => {
      await db.exercises.bulkAdd([
        buildExercise({ name: 'Bench Press' }),
        buildExercise({ name: 'Row' }),
      ]);

      const names = await service.getExistingNames();

      expect(names.has('bench press')).toBe(true);
      expect(names.has('row')).toBe(true);
    });
  });
});
