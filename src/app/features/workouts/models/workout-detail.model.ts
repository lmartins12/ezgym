import type { MuscleGroup, Workout } from '@core/models/app-models';

export interface WorkoutDetail extends Workout {
  exercise_count: number;
  last_trained?: number;
}

export interface AddExerciseData {
  workoutId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  notes?: string;
  sets: number;
  reps: string;
  targetWeight?: number;
  restSeconds: number;
}

export interface UpdateExerciseData {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  notes?: string;
  sets: number;
  reps: string;
  targetWeight?: number;
  restSeconds: number;
}
