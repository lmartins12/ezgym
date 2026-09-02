import { db } from '@core/db/app-db';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import {
  buildExercise,
  buildWorkout,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { ImportExport } from './import-export';
import { APP_VERSION } from './export-data';

const buildExportJson = (workouts: unknown[]) =>
  JSON.stringify({
    version: '1.0',
    exported_at: Date.now(),
    workouts,
  });

const buildExportExercise = (overrides: Record<string, unknown> = {}) => ({
  exercise_name: 'Squat',
  muscle_group: 'quadriceps',
  order_index: 0,
  sets: 3,
  reps: '10',
  rest_seconds: 60,
  ...overrides,
});

describe('ImportExport', () => {
  let useCase: ImportExport;

  beforeEach(async () => {
    await resetDatabase();
    useCase = injectService(ImportExport);
  });

  describe('exportWorkouts', () => {
    it('serializes workouts and exercises ordered, with the app version', async () => {
      const first = buildWorkout({ name: 'A', order_index: 1 });
      const second = buildWorkout({
        name: 'B',
        order_index: 0,
        description: 'Push day',
        muscle_group: 'chest',
      });
      const exercise = buildExercise({ name: 'Bench Press' });
      await db.workouts.bulkAdd([first, second]);
      await db.exercises.add(exercise);
      await db.workout_exercises.bulkAdd([
        {
          id: 'we-2',
          workout_id: second.id,
          exercise_id: exercise.id,
          order_index: 1,
          sets: 3,
          reps: '10',
          rest_seconds: 60,
        },
        {
          id: 'we-1',
          workout_id: second.id,
          exercise_id: exercise.id,
          order_index: 0,
          sets: 4,
          reps: '8-10',
          rest_seconds: 90,
        },
      ]);

      const json = await useCase.exportWorkouts();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0');
      expect(parsed.app_version).toBe(APP_VERSION);
      expect(parsed.workouts.map((w: { name: string }) => w.name)).toEqual([
        'B',
        'A',
      ]);
      const [b] = parsed.workouts;
      expect(b.description).toBe('Push day');
      expect(b.muscle_group).toBe('chest');
      expect(b.exercises.map((e: { sets: number }) => e.sets)).toEqual([4, 3]);
      expect(b.exercises[0].exercise_name).toBe('Bench Press');
    });
  });

  describe('importWorkouts', () => {
    it('imports workouts and creates exercises, continuing order indexes', async () => {
      await db.workouts.add(buildWorkout({ order_index: 3 }));

      const result = await useCase.importWorkouts(
        buildExportJson([
          {
            name: 'Leg Day',
            exercises: [buildExportExercise({ exercise_name: 'Squat' })],
          },
          {
            name: 'Pull Day',
            exercises: [buildExportExercise({ exercise_name: 'Row' })],
          },
        ]),
      );

      expect(result).toEqual({
        success: true,
        workoutsImported: 2,
        exercisesCreated: 2,
        exercisesReused: 0,
      });
      const workouts = await db.workouts.orderBy('order_index').toArray();
      expect(workouts.map((w) => w.order_index)).toEqual([3, 4, 5]);
      expect(await db.exercises.toArray()).toHaveLength(2);
      expect(await db.workout_exercises.toArray()).toHaveLength(2);
    });

    it('reuses existing exercises by normalized name', async () => {
      const existing = buildExercise({ name: 'Bench Press' });
      await db.exercises.add(existing);

      const result = await useCase.importWorkouts(
        buildExportJson([
          {
            name: 'Push Day',
            exercises: [
              buildExportExercise({
                exercise_name: '  bench press  ',
                muscle_group: 'chest',
              }),
            ],
          },
        ]),
      );

      expect(result.success).toBe(true);
      expect(result.exercisesReused).toBe(1);
      expect(result.exercisesCreated).toBe(0);

      const catalog = await db.exercises.toArray();
      expect(catalog).toHaveLength(1);

      const [we] = await db.workout_exercises.toArray();
      expect(we.exercise_id).toBe(existing.id);
    });

    it('rolls back the whole import when a write fails mid-transaction', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise({ name: 'Bench Press' });
      await db.workouts.add(workout);
      await db.exercises.add(exercise);

      const repo = injectService(WorkoutRepository);
      const realAdd = repo.add.bind(repo);
      let calls = 0;
      const spy = vi.spyOn(repo, 'add').mockImplementation((w) => {
        calls++;
        if (calls === 2) {
          return Promise.reject(new Error('boom'));
        }
        return realAdd(w);
      });

      const result = await useCase.importWorkouts(
        buildExportJson([
          {
            name: 'First',
            exercises: [buildExportExercise({ exercise_name: 'Squat' })],
          },
          {
            name: 'Second',
            exercises: [buildExportExercise({ exercise_name: 'Row' })],
          },
        ]),
      );
      spy.mockRestore();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('boom');

      // Everything written inside the transaction is undone
      expect(await db.workouts.toArray()).toHaveLength(1);
      expect((await db.workouts.toArray())[0].id).toBe(workout.id);
      expect(await db.exercises.toArray()).toHaveLength(1);
      expect(await db.workout_exercises.toArray()).toHaveLength(0);
    });

    it('fails gracefully for invalid JSON', async () => {
      const result = await useCase.importWorkouts('not json');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(await db.workouts.toArray()).toHaveLength(0);
    });
  });

  describe('getImportPreview', () => {
    it('separates new and existing exercises and warns about empty workouts', async () => {
      await db.exercises.add(buildExercise({ name: 'Bench Press' }));

      const preview = await useCase.getImportPreview(
        buildExportJson([
          {
            name: 'Push Day',
            exercises: [
              buildExportExercise({ exercise_name: 'Bench Press' }),
              buildExportExercise({ exercise_name: 'Squat' }),
            ],
          },
          { name: 'Empty Day', exercises: [] },
        ]),
      );

      expect(preview).not.toBeNull();
      expect(preview?.workoutCount).toBe(2);
      expect(preview?.existingExercises).toEqual(['Bench Press']);
      expect(preview?.newExercises).toEqual(['Squat']);
      expect(preview?.warnings).toHaveLength(1);
      expect(preview?.warnings[0].type).toBe('WORKOUT_WITHOUT_EXERCISES');
    });

    it('returns null for invalid JSON', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const preview = await useCase.getImportPreview('not json');

      expect(preview).toBeNull();
      errorSpy.mockRestore();
    });
  });
});
