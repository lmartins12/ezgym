vi.mock('@core/services/app-db', () => ({ db: {} }));

import { EXPORT_VERSION } from '@core/models/import-export.models';
import { ImportValidation } from './validation.utils';

function buildExercise(overrides: Record<string, unknown> = {}) {
  return {
    exercise_name: 'Bench Press',
    muscle_group: 'chest',
    order_index: 0,
    sets: 3,
    reps: '10',
    rest_seconds: 60,
    ...overrides,
  };
}

function buildExport(workouts: unknown[] = []) {
  return JSON.stringify({
    version: EXPORT_VERSION,
    exported_at: Date.now(),
    workouts,
  });
}

describe('ImportValidation.validateImport', () => {
  describe('JSON parsing', () => {
    it('rejects invalid JSON with INVALID_JSON error', async () => {
      const result = await ImportValidation.validateImport('{ not json');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('INVALID_JSON');
      expect(result.workoutCount).toBe(0);
    });
  });

  describe('schema validation', () => {
    it('accepts a valid export payload', async () => {
      const json = buildExport([
        {
          name: 'Push Day',
          exercises: [
            buildExercise(),
            buildExercise({ exercise_name: 'Incline Press', order_index: 1 }),
          ],
        },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.workoutCount).toBe(1);
      expect(result.exerciseCount).toBe(2);
    });

    it('rejects an empty workouts array', async () => {
      const result = await ImportValidation.validateImport(buildExport([]));

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects unsupported versions', async () => {
      const data = JSON.parse(buildExport([{ name: 'A', exercises: [] }]));
      data.version = '999';

      const result = await ImportValidation.validateImport(
        JSON.stringify(data),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('UNSUPPORTED_VERSION');
      expect(result.errors[0].value).toBe('999');
    });

    it('rejects invalid muscle groups', async () => {
      const json = buildExport([
        { name: 'A', exercises: [buildExercise({ muscle_group: 'wings' })] },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(false);
    });
  });

  describe('business rules', () => {
    it('warns for workouts without exercises', async () => {
      const json = buildExport([{ name: 'Empty Day', exercises: [] }]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('WORKOUT_WITHOUT_EXERCISES');
      expect(result.warnings[0].workoutName).toBe('Empty Day');
    });

    it('errors on duplicate order indices', async () => {
      const json = buildExport([
        {
          name: 'Push Day',
          exercises: [buildExercise(), buildExercise({ exercise_name: 'Row' })],
        },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('DUPLICATE_ORDER_INDEX');
    });

    it('errors on invalid reps format', async () => {
      const json = buildExport([
        {
          name: 'Push Day',
          exercises: [buildExercise({ reps: 'ten' })],
        },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_REPS_FORMAT');
      expect(result.errors[0].field).toBe('reps');
    });

    it('accepts range reps format', async () => {
      const json = buildExport([
        { name: 'Push Day', exercises: [buildExercise({ reps: '8-12' })] },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(true);
    });

    it('errors on out-of-range sets', async () => {
      const json = buildExport([
        { name: 'Push Day', exercises: [buildExercise({ sets: 99 })] },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_SETS_RANGE');
    });

    it('errors on negative rest_seconds', async () => {
      const json = buildExport([
        { name: 'Push Day', exercises: [buildExercise({ rest_seconds: -5 })] },
      ]);

      const result = await ImportValidation.validateImport(json);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_REST_RANGE');
    });
  });
});
