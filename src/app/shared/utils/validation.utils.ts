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
import { MUSCLE_GROUPS, type MuscleGroup } from '@core/models/app-models';
import {
  DESCRIPTION_MAX_LENGTH,
  EQUIPMENT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  REST_SECONDS_RANGE,
  SETS_RANGE,
  WEIGHT_RANGE,
  isValidRepsFormat,
} from '@core/models/limits';
import { z } from 'zod';

const muscleGroupSchema: z.ZodType<MuscleGroup> = z.enum(
  MUSCLE_GROUPS as [MuscleGroup, ...MuscleGroup[]],
);

/**
 * Zod schema for validating export data structure
 */
const exportExerciseSchema: z.ZodType<ExportExercise> = z.object({
  exercise_name: z
    .string()
    .min(1, 'Exercise name is required')
    .max(NAME_MAX_LENGTH),
  muscle_group: muscleGroupSchema,
  equipment: z.string().max(EQUIPMENT_MAX_LENGTH).optional(),
  notes: z.string().max(NOTES_MAX_LENGTH).optional(),
  order_index: z.number().int().min(0),
  sets: z.number().int().min(SETS_RANGE.min).max(SETS_RANGE.max),
  reps: z.string().min(1),
  rest_seconds: z
    .number()
    .int()
    .min(REST_SECONDS_RANGE.min)
    .max(REST_SECONDS_RANGE.max),
  target_weight: z
    .number()
    .nonnegative()
    .max(WEIGHT_RANGE.max)
    .optional(),
});

const exportWorkoutSchema: z.ZodType<ExportWorkout> = z.object({
  name: z.string().min(1, 'Workout name is required').max(NAME_MAX_LENGTH),
  description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
  muscle_group: muscleGroupSchema.optional(),
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
    return isValidRepsFormat(reps);
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
        if (
          error.path.some((segment) =>
            ['exercise_name', 'name', 'description', 'notes', 'equipment'].includes(
              String(segment),
            ),
          )
        ) {
          return 'TEXT_TOO_LONG' as ValidationErrorType;
        }
        return 'INVALID_JSON' as ValidationErrorType;
      default:
        return 'INVALID_JSON' as ValidationErrorType;
    }
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
