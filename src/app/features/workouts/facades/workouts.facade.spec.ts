import { db } from '@core/db/app-db';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import {
  buildExercise,
  buildSession,
  buildSetLog,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { vi } from 'vitest';
import { WorkoutsFacade } from './workouts.facade';

describe('WorkoutsFacade', () => {
  let facade: WorkoutsFacade;

  beforeEach(async () => {
    await resetDatabase();
    facade = injectService(WorkoutsFacade);
  });

  describe('list', () => {
    it('returns empty list when there are no workouts', async () => {
      const result = await facade.list();
      expect(result).toEqual([]);
    });

    it('returns workouts with exercise count and last trained', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise();
      await db.workouts.add(workout);
      await db.exercises.add(exercise);
      await db.workout_exercises.bulkAdd([
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: exercise.id,
          order_index: 0,
        }),
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: exercise.id,
          order_index: 1,
        }),
      ]);
      const startedAt = Date.now() - 60000;
      await db.workout_sessions.add(
        buildSession({ workout_id: workout.id, started_at: startedAt }),
      );

      const result = await facade.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(workout.id);
      expect(result[0].exercise_count).toBe(2);
      expect(result[0].last_trained).toBe(startedAt);
    });

    it('sorts by order_index ascending', async () => {
      await db.workouts.bulkAdd([
        buildWorkout({ name: 'B', order_index: 1 }),
        buildWorkout({ name: 'A', order_index: 0 }),
      ]);

      const result = await facade.list();

      expect(result.map((w) => w.name)).toEqual(['A', 'B']);
    });
  });

  describe('create', () => {
    it('appends the new workout after the current max order', async () => {
      await db.workouts.add(buildWorkout({ order_index: 3 }));

      const id = await facade.create('Leg Day');

      const created = await db.workouts.get(id);
      expect(created).toBeDefined();
      expect(created?.order_index).toBe(4);
    });
  });

  describe('reorderWorkouts', () => {
    it('persists the new order atomically', async () => {
      const w1 = buildWorkout({ order_index: 0 });
      const w2 = buildWorkout({ order_index: 1 });
      const w3 = buildWorkout({ order_index: 2 });
      await db.workouts.bulkAdd([w1, w2, w3]);

      await facade.reorderWorkouts([w3.id, w1.id, w2.id]);

      const workouts = await db.workouts.orderBy('order_index').toArray();
      expect(workouts.map((w) => w.id)).toEqual([w3.id, w1.id, w2.id]);
    });
  });

  describe('delete', () => {
    it('cascades to exercises, sessions and set logs', async () => {
      const workout = buildWorkout();
      const exercise = buildExercise();
      const session = buildSession({ workout_id: workout.id });
      await db.workouts.add(workout);
      await db.exercises.add(exercise);
      await db.workout_exercises.add(
        buildWorkoutExercise({
          workout_id: workout.id,
          exercise_id: exercise.id,
        }),
      );
      await db.workout_sessions.add(session);
      await db.set_logs.add(
        buildSetLog({ session_id: session.id, exercise_id: exercise.id }),
      );

      await facade.delete(workout.id);

      expect(await db.workouts.get(workout.id)).toBeUndefined();
      expect(await db.workout_exercises.toArray()).toHaveLength(0);
      expect(await db.workout_sessions.toArray()).toHaveLength(0);
      expect(await db.set_logs.toArray()).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('returns null for unknown ids', async () => {
      const result = await facade.getById('nope');
      expect(result).toBeNull();
    });
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

      await facade.updateExercise(row.id, {
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

      await facade.updateExercise(row.id, {
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
        facade.updateExercise('missing', {
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

  describe('addExercises (picker flow)', () => {
    const pickerDefaults = { sets: 3, reps: '12', restSeconds: 60 };

    it('creates one workout_exercise per picked option with defaults', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);

      await facade.addExercises([
        {
          workoutId: workout.id,
          name: 'Supino Reto',
          muscleGroup: 'chest',
          equipment: 'Barra',
          ...pickerDefaults,
        },
        {
          workoutId: workout.id,
          name: 'Puxada Alta',
          muscleGroup: 'back',
          equipment: 'Polia',
          ...pickerDefaults,
        },
      ]);

      const rows = await db.workout_exercises
        .where('workout_id')
        .equals(workout.id)
        .toArray();
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.order_index).sort((a, b) => a - b)).toEqual([
        0, 1,
      ]);
      expect(
        rows.every(
          (r) =>
            r.sets === 3 &&
            r.reps === '12' &&
            r.rest_seconds === 60 &&
            r.target_weight === undefined,
        ),
      ).toBe(true);

      const catalog = await db.exercises.toArray();
      expect(catalog.map((e) => e.name).sort()).toEqual([
        'Puxada Alta',
        'Supino Reto',
      ]);
      const supino = catalog.find((e) => e.name === 'Supino Reto');
      expect(supino).toMatchObject({
        muscle_group: 'chest',
        equipment: 'Barra',
      });
    });

    it('reuses the existing exercise when the name matches (dedupe)', async () => {
      const workout = buildWorkout();
      const existing = buildExercise({
        name: 'Supino Reto',
        muscle_group: 'chest',
        equipment: 'Barra',
        notes: 'pegada média',
      });
      await db.workouts.add(workout);
      await db.exercises.add(existing);

      await facade.addExercises([
        {
          workoutId: workout.id,
          name: 'Supino Reto',
          muscleGroup: 'chest',
          equipment: 'Barra',
          notes: 'pegada média',
          ...pickerDefaults,
        },
      ]);

      expect(await db.exercises.count()).toBe(1);
      const stored = await db.exercises.get(existing.id);
      expect(stored).toMatchObject({
        muscle_group: 'chest',
        equipment: 'Barra',
        notes: 'pegada média',
      });
      const rows = await db.workout_exercises
        .where('workout_id')
        .equals(workout.id)
        .toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].exercise_id).toBe(existing.id);
    });

    it('preserves catalog notes of an existing exercise', async () => {
      const workout = buildWorkout();
      const existing = buildExercise({
        name: 'Remada Curvada',
        notes: 'coluna neutra',
      });
      await db.workouts.add(workout);
      await db.exercises.add(existing);

      await facade.addExercises([
        {
          workoutId: workout.id,
          name: existing.name,
          muscleGroup: existing.muscle_group,
          equipment: existing.equipment,
          notes: existing.notes,
          ...pickerDefaults,
        },
      ]);

      const stored = await db.exercises.get(existing.id);
      expect(stored?.notes).toBe('coluna neutra');
    });

    it('rolls back the whole batch when one item fails', async () => {
      const workout = buildWorkout();
      await db.workouts.add(workout);
      const workoutRepository = injectService(WorkoutRepository);
      vi.spyOn(workoutRepository, 'addWorkoutExercise').mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(
        facade.addExercises([
          {
            workoutId: workout.id,
            name: 'Supino Reto',
            muscleGroup: 'chest',
            ...pickerDefaults,
          },
          {
            workoutId: workout.id,
            name: 'Puxada Alta',
            muscleGroup: 'back',
            ...pickerDefaults,
          },
        ]),
      ).rejects.toThrow('boom');

      expect(await db.workout_exercises.count()).toBe(0);
      expect(await db.exercises.count()).toBe(0);
    });
  });

  describe('getExercises', () => {
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

      const detailed = await facade.getExercises(workout.id);

      expect(detailed).toHaveLength(1);
      expect(detailed[0]).toMatchObject({
        exercise_name: exercise.name,
        muscle_group: 'chest',
        notes: 'focus on tempo',
      });
    });
  });
});
