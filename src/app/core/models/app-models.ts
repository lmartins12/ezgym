export type MuscleGroup =
  | 'chest'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'shoulders'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves'
  | 'forearms'
  | 'abs'
  | 'cardio'
  | 'other';

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
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
] as const;

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  muscle_group?: MuscleGroup;
  created_at: number;
  updated_at: number;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  target_weight?: number;
  exercise_name?: string;
  muscle_group?: MuscleGroup;
}

export interface WorkoutSession {
  id: string;
  workout_id: string;
  started_at: number;
  finished_at?: number;
  notes?: string;
  workout_name?: string;
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed_at: number;
}
