import { db } from '@core/services/app-db';
import {
  EXPORT_VERSION,
  type ExportData,
  type ExportExercise,
  type ExportWorkout,
  type ValidationError,
  type ValidationErrorType,
  type ValidationResult,
  type ValidationWarning,
  type ValidationWarningType,
} from '@core/models/import-export.models';
import { z } from 'zod';

/**
 * Zod schema for validating export data structure
 */
const exportExerciseSchema: z.ZodType<ExportExercise> = z.object({
  exercise_name: z.string().min(1, 'Exercise name is required'),
  muscle_group: z.enum([
    'upper',
    'lower',
    'chest',
    'triceps',
    'back',
    'biceps',
    'shoulders',
    'quadriceps',
    'hamstrings',
    'calves',
    'forearms',
    'abs',
    'cardio',
    'other',
  ]),
  equipment: z.string().optional(),
  notes: z.string().optional(),
  order_index: z.number().int().min(0),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1),
  rest_seconds: z.number().int().min(0).max(600),
  target_weight: z.number().nonnegative().max(1000).optional(),
});

const exportWorkoutSchema: z.ZodType<ExportWorkout> = z.object({
  name: z.string().min(1, 'Workout name is required'),
  description: z.string().optional(),
  muscle_group: z
    .enum([
      'upper',
      'lower',
      'chest',
      'triceps',
      'back',
      'biceps',
      'shoulders',
      'quadriceps',
      'hamstrings',
      'calves',
      'forearms',
      'abs',
      'cardio',
      'other',
    ])
    .optional(),
  exercises: z.array(exportExerciseSchema),
});

const exportDataSchema: z.ZodType<ExportData> = z.object({
  version: z.string().min(1),
  exported_at: z.number().int().nonnegative(),
  app_version: z.string().optional(),
  workouts: z
    .array(exportWorkoutSchema)
    .min(1, 'At least one workout is required'),
});

/**
 * Validation utility class for import/export operations
 */
export class ImportValidation {
  /**
   * Validate JSON string for import
   */
  static async validateImport(jsonString: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let workoutCount = 0;
    let exerciseCount = 0;

    // 1. Parse JSON
    let data: unknown;
    try {
      data = JSON.parse(jsonString);
    } catch {
      return {
        isValid: false,
        errors: [
          {
            type: 'INVALID_JSON' as ValidationErrorType,
            message: 'INVALID_JSON',
          },
        ],
        warnings: [],
        workoutCount: 0,
        exerciseCount: 0,
      };
    }

    // 2. Validate schema
    const schemaResult = exportDataSchema.safeParse(data);
    if (!schemaResult.success) {
      const zodErrors = schemaResult.error.issues;
      for (const error of zodErrors) {
        errors.push(this.mapZodError(error));
      }
      return {
        isValid: false,
        errors,
        warnings,
        workoutCount: 0,
        exerciseCount: 0,
      };
    }

    const exportData = schemaResult.data;

    // 3. Check version
    if (exportData.version !== EXPORT_VERSION) {
      errors.push({
        type: 'UNSUPPORTED_VERSION' as ValidationErrorType,
        message: 'UNSUPPORTED_VERSION',
        value: exportData.version,
      });
    }

    // 4. Validate business rules
    for (let wIndex = 0; wIndex < exportData.workouts.length; wIndex++) {
      const workout = exportData.workouts[wIndex];

      // Check for workouts without exercises (warning, not error)
      if (workout.exercises.length === 0) {
        warnings.push({
          type: 'WORKOUT_WITHOUT_EXERCISES' as ValidationWarningType,
          workoutIndex: wIndex,
          workoutName: workout.name,
          message: 'WORKOUT_WITHOUT_EXERCISES',
        });
      }

      // Check for duplicate order indices
      const orderIndices = workout.exercises.map((e) => e.order_index);
      const uniqueIndices = new Set(orderIndices);
      if (orderIndices.length !== uniqueIndices.size) {
        errors.push({
          type: 'DUPLICATE_ORDER_INDEX' as ValidationErrorType,
          workoutIndex: wIndex,
          workoutName: workout.name,
          message: 'DUPLICATE_ORDER_INDEX',
        });
      }

      // Count exercises
      exerciseCount += workout.exercises.length;

      // Validate reps format for each exercise
      for (let eIndex = 0; eIndex < workout.exercises.length; eIndex++) {
        const exercise = workout.exercises[eIndex];
        if (!this.isValidRepsFormat(exercise.reps)) {
          errors.push({
            type: 'INVALID_REPS_FORMAT' as ValidationErrorType,
            workoutIndex: wIndex,
            workoutName: workout.name,
            exerciseIndex: eIndex,
            exerciseName: exercise.exercise_name,
            field: 'reps',
            value: exercise.reps,
            message: 'INVALID_REPS_FORMAT',
          });
        }
      }
    }

    workoutCount = exportData.workouts.length;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      workoutCount,
      exerciseCount,
    };
  }

  /**
   * Validate reps format (must be "12" or "8-10")
   */
  private static isValidRepsFormat(reps: string): boolean {
    // Single number: "12"
    const singleNumber = /^\d+$/;
    // Range: "8-10"
    const range = /^\d+-\d+$/;

    return singleNumber.test(reps) || range.test(reps);
  }

  /**
   * Map Zod error to ValidationError
   */
  private static mapZodError(error: z.ZodIssue): ValidationError {
    const path = error.path.join('.');
    const type = this.getErrorTypeFromZod(error);
    return {
      type,
      field: path || undefined,
      value: undefined,
      message: type,
    };
  }

  /**
   * Map Zod error code to ValidationErrorType
   */
  private static getErrorTypeFromZod(error: z.ZodIssue): ValidationErrorType {
    switch (error.code) {
      case z.ZodIssueCode.invalid_type:
        return 'INVALID_JSON' as ValidationErrorType;
      case z.ZodIssueCode.too_small:
        if (error.path.includes('sets')) {
          return 'INVALID_SETS_RANGE' as ValidationErrorType;
        }
        if (error.path.includes('rest_seconds')) {
          return 'INVALID_REST_RANGE' as ValidationErrorType;
        }
        return 'INVALID_JSON' as ValidationErrorType;
      case z.ZodIssueCode.too_big:
        if (error.path.includes('sets')) {
          return 'INVALID_SETS_RANGE' as ValidationErrorType;
        }
        if (error.path.includes('rest_seconds')) {
          return 'INVALID_REST_RANGE' as ValidationErrorType;
        }
        if (error.path.includes('target_weight')) {
          return 'INVALID_WEIGHT_RANGE' as ValidationErrorType;
        }
        return 'INVALID_JSON' as ValidationErrorType;
      default:
        return 'INVALID_JSON' as ValidationErrorType;
    }
  }

  /**
   * Get existing exercise names from database
   */
  static async getExistingExerciseNames(): Promise<Set<string>> {
    try {
      const exercises = await db.exercises.toArray();
      return new Set(exercises.map((e) => e.name.toLowerCase()));
    } catch {
      return new Set();
    }
  }

  /**
   * Identify new vs existing exercises
   */
  static async categorizeExercises(
    workouts: ExportWorkout[],
  ): Promise<{ newExercises: string[]; existingExercises: string[] }> {
    const existingNames = await this.getExistingExerciseNames();
    const newExercises = new Set<string>();
    const existingExercises = new Set<string>();

    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        const normalizedName = exercise.exercise_name.toLowerCase();
        if (existingNames.has(normalizedName)) {
          existingExercises.add(exercise.exercise_name);
        } else {
          newExercises.add(exercise.exercise_name);
        }
      }
    }

    return {
      newExercises: Array.from(newExercises),
      existingExercises: Array.from(existingExercises),
    };
  }
}

/**
 * Factory function to get error message key
 */
export function getErrorMessageKey(error: ValidationError): string {
  return error.message;
}

/**
 * Factory function to get warning message key
 */
export function getWarningMessageKey(warning: ValidationWarning): string {
  return warning.message;
}
