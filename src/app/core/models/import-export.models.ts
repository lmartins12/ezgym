import type { MuscleGroup } from './app-models';

/**
 * Export format version - for future compatibility
 */
export const EXPORT_VERSION = '1.0';

/**
 * Exercise data in export format (no ID, referenced by name)
 */
export interface ExportExercise {
  exercise_name: string;
  muscle_group: MuscleGroup;
  equipment?: string;
  notes?: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  target_weight?: number;
}

/**
 * Workout data in export format (no ID)
 */
export interface ExportWorkout {
  name: string;
  description?: string;
  muscle_group?: MuscleGroup;
  exercises: ExportExercise[];
}

/**
 * Complete export data structure
 */
export interface ExportData {
  version: string;
  exported_at: number;
  app_version?: string;
  workouts: ExportWorkout[];
}

/**
 * Validation error types
 */
export enum ValidationErrorType {
  INVALID_JSON = 'INVALID_JSON',
  MISSING_VERSION = 'MISSING_VERSION',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  EMPTY_WORKOUTS = 'EMPTY_WORKOUTS',
  INVALID_WORKOUT_NAME = 'INVALID_WORKOUT_NAME',
  INVALID_MUSCLE_GROUP = 'INVALID_MUSCLE_GROUP',
  INVALID_REPS_FORMAT = 'INVALID_REPS_FORMAT',
  INVALID_SETS_RANGE = 'INVALID_SETS_RANGE',
  INVALID_REST_RANGE = 'INVALID_REST_RANGE',
  INVALID_WEIGHT_RANGE = 'INVALID_WEIGHT_RANGE',
  DUPLICATE_ORDER_INDEX = 'DUPLICATE_ORDER_INDEX',
  EMPTY_EXERCISE_NAME = 'EMPTY_EXERCISE_NAME',
}

/**
 * Single validation error
 */
export interface ValidationError {
  type: ValidationErrorType;
  workoutIndex?: number;
  workoutName?: string;
  exerciseIndex?: number;
  exerciseName?: string;
  field?: string;
  value?: unknown;
  message: string;
}

/**
 * Validation warning types (non-blocking)
 */
export enum ValidationWarningType {
  WORKOUT_WITHOUT_EXERCISES = 'WORKOUT_WITHOUT_EXERCISES',
}

/**
 * Single validation warning
 */
export interface ValidationWarning {
  type: ValidationWarningType;
  workoutIndex?: number;
  workoutName?: string;
  message: string;
}

/**
 * Result of import validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  workoutCount: number;
  exerciseCount: number;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean;
  workoutsImported: number;
  exercisesCreated: number;
  exercisesReused: number;
  errors?: string[];
}

/**
 * Preview data for import confirmation
 */
export interface ImportPreview {
  workoutCount: number;
  newExercises: string[];
  existingExercises: string[];
  warnings: ValidationWarning[];
}
