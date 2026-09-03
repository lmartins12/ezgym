import { db } from '@core/db/app-db';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import {
  buildExercise,
  buildWorkout,
  buildWorkoutExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { ExercisePickerQuery } from './exercise-picker.query';

describe('ExercisePickerQuery', () => {
  let query: ExercisePickerQuery;

  beforeEach(async () => {
    await resetDatabase();
    query = injectService(ExercisePickerQuery);
  });

  const seedCatalogExercise = async (
    name: string,
    muscleGroup: MuscleGroup,
  ) => {
    const exercise = buildExercise({ name, muscle_group: muscleGroup });
    await db.exercises.add(exercise);
    return exercise;
  };

  const seedUsage = async (exerciseId: string, workoutIds: string[]) => {
    for (const [i, workoutId] of workoutIds.entries()) {
      await db.workout_exercises.add(
        buildWorkoutExercise({
          exercise_id: exerciseId,
          workout_id: workoutId,
          order_index: i,
        }),
      );
    }
  };

  describe('library', () => {
    it('returns the whole library when there is no search or filter', async () => {
      const result = await query.build('', null, 'pt');

      expect(result.recents).toEqual([]);
      expect(result.mine).toEqual([]);
      expect(result.library.length).toBeGreaterThan(100);

      const supino = result.library.find((o) => o.slug === 'supino-reto');
      expect(supino?.key).toBe('lib:supino-reto');
      expect(supino?.name).toBe('Supino Reto');
      expect(supino?.muscle_group).toBe('chest');
      expect(supino?.equipment_kind).toBe('barbell');
    });

    it('displays library names in the active language', async () => {
      const result = await query.build('', null, 'en');

      const supino = result.library.find((o) => o.slug === 'supino-reto');
      expect(supino?.name).toBe('Barbell Bench Press');
    });

    it('hides library items whose name already exists in the catalog (db wins)', async () => {
      await seedCatalogExercise('Supino Reto', 'chest');

      const result = await query.build('', null, 'pt');

      expect(
        result.library.find((o) => o.slug === 'supino-reto'),
      ).toBeUndefined();
      expect(result.mine.map((o) => o.name)).toContain('Supino Reto');
    });

    it('hides library items cross-language when the movement was materialized before', async () => {
      await seedCatalogExercise('Supino Reto', 'chest');

      const result = await query.build('', null, 'en');

      expect(
        result.library.find((o) => o.slug === 'supino-reto'),
      ).toBeUndefined();
    });
  });

  describe('search', () => {
    it('matches library names ignoring accents and case', async () => {
      const result = await query.build('ELEVAÇÃO PÉLVICA', null, 'pt');

      expect(
        result.library.find((o) => o.slug === 'elevacao-pelvica'),
      ).toBeDefined();
    });

    it('matches through aliases in the active language', async () => {
      const result = await query.build('banca', null, 'pt');

      expect(
        result.library.find((o) => o.slug === 'supino-reto'),
      ).toBeDefined();
    });

    it('matches cross-language, including the other name and aliases', async () => {
      const result = await query.build('supino', null, 'en');

      expect(
        result.library.find((o) => o.slug === 'supino-reto'),
      ).toBeDefined();
    });

    it('applies the search term to user exercises', async () => {
      await seedCatalogExercise('Rosca Direta', 'biceps');
      await seedCatalogExercise('Supino Reto', 'chest');

      const result = await query.build('rosca', null, 'pt');

      expect(result.mine.map((o) => o.name)).toEqual(['Rosca Direta']);
      expect(
        result.library.find((o) => o.slug === 'supino-reto'),
      ).toBeUndefined();
    });

    it('applies the search term to recents', async () => {
      const rosca = await seedCatalogExercise('Rosca Direta', 'biceps');
      const supino = await seedCatalogExercise('Supino Reto', 'chest');
      await db.workouts.add(buildWorkout({ id: 'w-1', updated_at: 1000 }));
      await seedUsage(rosca.id, ['w-1']);
      await seedUsage(supino.id, ['w-1']);

      const result = await query.build('rosca', null, 'pt');

      expect(result.recents.map((o) => o.name)).toEqual(['Rosca Direta']);
    });
  });

  describe('muscle filter', () => {
    it('applies the muscle filter to all three lists', async () => {
      const rosca = await seedCatalogExercise('Rosca Direta', 'biceps');
      const supino = await seedCatalogExercise('Supino Reto', 'chest');
      await db.workouts.add(buildWorkout({ id: 'w-1', updated_at: 1000 }));
      await seedUsage(rosca.id, ['w-1']);
      await seedUsage(supino.id, ['w-1']);

      const result = await query.build('', 'biceps', 'pt');

      expect(result.recents.map((o) => o.name)).toEqual(['Rosca Direta']);
      expect(result.mine.map((o) => o.name)).toEqual(['Rosca Direta']);
      expect(result.library.length).toBeGreaterThan(0);
      expect(result.library.every((o) => o.muscle_group === 'biceps')).toBe(
        true,
      );
      expect(
        result.library.find((o) => o.slug === 'supino-reto'),
      ).toBeUndefined();
    });
  });

  describe('recents', () => {
    it('ranks by usage frequency with recency metadata', async () => {
      const a = await seedCatalogExercise('A', 'chest');
      const b = await seedCatalogExercise('B', 'back');
      const c = await seedCatalogExercise('C', 'shoulders');
      await db.workouts.bulkAdd([
        buildWorkout({ id: 'w-1', updated_at: 1000 }),
        buildWorkout({ id: 'w-2', updated_at: 2000 }),
        buildWorkout({ id: 'w-3', updated_at: 3000 }),
      ]);
      await seedUsage(a.id, ['w-1', 'w-2']); // count 2, last touch 2000
      await seedUsage(b.id, ['w-3']); // count 1, last touch 3000
      await seedUsage(c.id, ['w-1']); // count 1, last touch 1000

      const result = await query.build('', null, 'pt');

      expect(result.recents.map((o) => o.name)).toEqual(['A', 'B', 'C']);
      expect(result.recents[0].use_count).toBe(2);
      expect(result.recents[0].last_used_at).toBe(2000);
      expect(result.recents[0].key).toBe(`db:${a.id}`);
      expect(result.recents[0].source).toBe('recent');
    });

    it('uses recency as tiebreaker when frequency is equal', async () => {
      const b = await seedCatalogExercise('B', 'back');
      const c = await seedCatalogExercise('C', 'shoulders');
      await db.workouts.bulkAdd([
        buildWorkout({ id: 'w-2', updated_at: 3000 }),
        buildWorkout({ id: 'w-1', updated_at: 1000 }),
      ]);
      await seedUsage(b.id, ['w-2']);
      await seedUsage(c.id, ['w-1']);

      const result = await query.build('', null, 'pt');

      expect(result.recents.map((o) => o.name)).toEqual(['B', 'C']);
    });

    it('returns at most 5 recents', async () => {
      await db.workouts.add(buildWorkout({ id: 'w-1', updated_at: 1000 }));
      const groups = [
        'chest',
        'back',
        'biceps',
        'triceps',
        'shoulders',
        'quadriceps',
        'hamstrings',
      ] as const;
      for (const group of groups) {
        const exercise = await seedCatalogExercise(`Ex ${group}`, group);
        await seedUsage(exercise.id, ['w-1']);
      }

      const result = await query.build('', null, 'pt');

      expect(result.recents).toHaveLength(5);
      expect(result.mine).toHaveLength(7);
    });

    it('skips orphan junction rows without a catalog exercise', async () => {
      await db.workout_exercises.add(
        buildWorkoutExercise({ exercise_id: 'ghost', workout_id: 'w-1' }),
      );

      const result = await query.build('', null, 'pt');

      expect(result.recents).toEqual([]);
    });
  });

  it('carries catalog metadata for user exercises', async () => {
    const exercise = buildExercise({
      name: 'Supino Reto',
      equipment: 'Barra',
      notes: 'pegada média',
    });
    await db.exercises.add(exercise);

    const result = await query.build('', null, 'pt');

    const option = result.mine.find((o) => o.exercise_id === exercise.id);
    expect(option).toBeDefined();
    expect(option?.equipment).toBe('Barra');
    expect(option?.notes).toBe('pegada média');
  });

  describe('wipe-safety', () => {
    it('never writes to the database', async () => {
      await seedCatalogExercise('Supino Reto', 'chest');
      const exercisesBefore = await db.exercises.count();

      await query.build('supino', null, 'pt');

      expect(await db.exercises.count()).toBe(exercisesBefore);
      expect(await db.workout_exercises.count()).toBe(0);
    });
  });
});
