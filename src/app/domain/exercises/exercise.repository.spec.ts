import { db } from '@core/db/app-db';
import {
  buildExercise,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { ExerciseRepository } from './exercise.repository';

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

    it('dedupes accented and unaccented names', async () => {
      const existing = buildExercise({ name: 'Tríceps Testa' });
      await db.exercises.add(existing);

      const { exerciseId, isNew } = await service.findOrCreate({
        name: 'Triceps Testa',
        muscleGroup: 'triceps',
      });

      expect(isNew).toBe(false);
      expect(exerciseId).toBe(existing.id);
      const all = await db.exercises.toArray();
      expect(all).toHaveLength(1);
    });

    it('keeps the knownExercises map consistent across a batch', async () => {
      const known = await service.getNameMap();

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

  describe('listAll', () => {
    it('returns every catalog exercise', async () => {
      await db.exercises.bulkAdd([
        buildExercise({ name: 'Bench Press' }),
        buildExercise({ name: 'Row' }),
      ]);

      const all = await service.listAll();

      expect(all).toHaveLength(2);
      expect(all.map((e) => e.name).sort()).toEqual(['Bench Press', 'Row']);
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

    it('strips accents from normalized names', async () => {
      await db.exercises.bulkAdd([buildExercise({ name: 'Elevação Pélvica' })]);

      const names = await service.getExistingNames();

      expect(names.has('elevacao pelvica')).toBe(true);
      expect(names.has('elevação pélvica')).toBe(false);
    });
  });
});
