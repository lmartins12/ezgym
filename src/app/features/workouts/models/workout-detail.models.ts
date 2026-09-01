import type { MuscleGroup } from '@domain/shared/muscle-group';
import type { Workout } from '@domain/workouts/workout';

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
