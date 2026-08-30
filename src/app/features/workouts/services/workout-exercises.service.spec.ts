import { db } from '@core/services/app-db';
import {
  buildExercise,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { WorkoutExercisesService } from './workout-exercises.service';

describe('WorkoutExercisesService', () => {
  let service: WorkoutExercisesService;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(WorkoutExercisesService);
  });

  describe('updateExercise', () => {
    it('updates prescription fields on the junction row', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise();
      await db.workouts.add(workout);
      await db.exercises.add(exercise);
      const row = buildWorkoutExercise({
        workout_id: workout.id,
        exercise_id: exercise.id,
      });
      await db.workout_exercises.add(row);

      await service.updateExercise(row.id, {
        name: exercise.name,
        muscleGroup: 'chest',
        sets: 5,
        reps: '6',
        targetWeight: 100,
        restSeconds: 90,
      });

      const updated = await db.workout_exercises.get(row.id);
      expect(updated).toMatchObject({
        sets: 5,
        reps: '6',
        rest_seconds: 90,
        target_weight: 100,
      });
    });

    it('syncs catalog metadata by exercise id without creating duplicates', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise({ name: 'Bench Press' });
      await db.workouts.add(workout);
      await db.exercises.add(exercise);
      const row = buildWorkoutExercise({
        workout_id: workout.id,
        exercise_id: exercise.id,
      });
      await db.workout_exercises.add(row);

      await service.updateExercise(row.id, {
        name: 'Incline Bench Press',
        muscleGroup: 'shoulders',
        equipment: 'barbell',
        notes: 'slow eccentric',
        sets: 3,
        reps: '10',
        restSeconds: 60,
      });

      const catalog = await db.exercises.toArray();
      expect(catalog).toHaveLength(1);
      expect(catalog[0]).toMatchObject({
        id: exercise.id,
        name: 'Incline Bench Press',
        muscle_group: 'shoulders',
        equipment: 'barbell',
        notes: 'slow eccentric',
      });
    });

    it('does nothing for an unknown junction id', async () => {
      const exercise = buildExercise();
      await db.exercises.add(exercise);

      await expect(
        service.updateExercise('missing', {
          name: 'X',
          muscleGroup: 'chest',
          sets: 1,
          reps: '1',
          restSeconds: 60,
        }),
      ).resolves.toBeUndefined();

      expect(await db.exercises.toArray()).toHaveLength(1);
    });
  });

  describe('getByWorkoutId', () => {
    it('joins exercise metadata including notes', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise({ notes: 'focus on tempo' });
      await db.workouts.add(workout);
      await db.exercises.add(exercise);
      await db.workout_exercises.add(
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: exercise.id,
        }),
      );

      const detailed = await service.getByWorkoutId(workout.id);

      expect(detailed).toHaveLength(1);
      expect(detailed[0]).toMatchObject({
        exercise_name: exercise.name,
        muscle_group: 'chest',
        notes: 'focus on tempo',
      });
    });
  });
});
