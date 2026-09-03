import { db } from '@core/db/app-db';
import { MUSCLE_GROUPS } from '../shared/muscle-group';
import { normalizeText } from '../shared/normalize-text';
import { resetDatabase } from '@testing/db-test-helpers';
import {
  EQUIPMENT_KINDS,
  libraryExerciseSchema,
  loadExerciseLibrary,
  type LibraryExercise,
} from './exercise-library';

describe('exercise-library', () => {
  describe('loadExerciseLibrary (real asset)', () => {
    let library: readonly LibraryExercise[];

    beforeAll(async () => {
      library = await loadExerciseLibrary();
    });

    it('loads the bundled asset as a non-empty typed array', () => {
      expect(library.length).toBeGreaterThan(100);

      const supino = library.find((e) => e.slug === 'supino-reto');
      expect(supino?.name).toEqual({
        pt: 'Supino Reto',
        en: 'Barbell Bench Press',
      });
      expect(supino?.muscle_group).toBe('chest');
      expect(supino?.equipment).toBe('barbell');
    });

    it('caches the library in memory after the first load', async () => {
      const again = await loadExerciseLibrary();
      expect(again).toBe(library);
    });

    it('keeps slugs unique', () => {
      const slugs = new Set(library.map((e) => e.slug));
      expect(slugs.size).toBe(library.length);
    });

    it('requires canonical names in both languages, unique per language', () => {
      const ptNames = new Set<string>();
      const enNames = new Set<string>();
      for (const exercise of library) {
        expect(exercise.name.pt.trim().length).toBeGreaterThan(0);
        expect(exercise.name.en.trim().length).toBeGreaterThan(0);
        ptNames.add(normalizeText(exercise.name.pt));
        enNames.add(normalizeText(exercise.name.en));
      }
      expect(ptNames.size).toBe(library.length);
      expect(enNames.size).toBe(library.length);
    });

    it('only uses valid muscle groups and equipment kinds', () => {
      const groups = new Set(MUSCLE_GROUPS);
      const kinds = new Set(EQUIPMENT_KINDS);
      for (const exercise of library) {
        expect(groups.has(exercise.muscle_group)).toBe(true);
        expect(kinds.has(exercise.equipment)).toBe(true);
      }
    });

    it('never has an alias equal to its own name', () => {
      for (const exercise of library) {
        const ownNames = [
          normalizeText(exercise.name.pt),
          normalizeText(exercise.name.en),
        ];
        for (const lang of ['pt', 'en'] as const) {
          for (const alias of exercise.aliases?.[lang] ?? []) {
            expect(ownNames).not.toContain(normalizeText(alias));
          }
        }
      }
    });

    it('covers the essential muscle groups with anchor movements', () => {
      const groups = new Set(library.map((e) => e.muscle_group));
      const essentials = [
        'chest',
        'back',
        'quadriceps',
        'hamstrings',
        'shoulders',
        'biceps',
        'triceps',
      ] as const;
      for (const essential of essentials) {
        expect(groups.has(essential)).toBe(true);
      }
    });

    it('is wipe-safe: never writes to IndexedDB', async () => {
      await resetDatabase();
      const exercisesBefore = await db.exercises.count();

      await loadExerciseLibrary();

      expect(await db.exercises.count()).toBe(exercisesBefore);
      expect(await db.workout_exercises.count()).toBe(0);
    });
  });

  describe('libraryExerciseSchema', () => {
    const validExercise = {
      slug: 'supino-reto',
      name: { pt: 'Supino Reto', en: 'Barbell Bench Press' },
      muscle_group: 'chest',
      equipment: 'barbell',
    };

    it('accepts an exercise without aliases', () => {
      expect(libraryExerciseSchema.safeParse(validExercise).success).toBe(true);
    });

    it('accepts aliases in both languages', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        aliases: { pt: ['supino'], en: ['bench'] },
      });
      expect(result.success).toBe(true);
    });

    it('accepts aliases in a single language', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        aliases: { pt: ['banca'] },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a missing english name', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        name: { pt: 'Supino Reto' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an empty name', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        name: { pt: '', en: 'Barbell Bench Press' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown muscle group', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        muscle_group: 'glutes',
      });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown equipment kind', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        equipment: 'rope',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty alias strings', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        aliases: { pt: [''] },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys (curation typos fail fast)', () => {
      const result = libraryExerciseSchema.safeParse({
        ...validExercise,
        alises: { pt: ['supino'] },
      });
      expect(result.success).toBe(false);
    });
  });
});
