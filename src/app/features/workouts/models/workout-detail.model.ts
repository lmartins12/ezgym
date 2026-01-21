import type { Workout } from '@core';

export interface WorkoutDetail extends Workout {
  exercise_count: number;
  last_trained?: number;
}

export interface AddExerciseData {
  workoutId: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  notes?: string;
  sets: number;
  reps: string;
  targetWeight?: number;
  restSeconds: number;
}

export interface UpdateExerciseData {
  sets: number;
  reps: string;
  targetWeight?: number;
  restSeconds: number;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'other';

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
  'other',
] as const;
