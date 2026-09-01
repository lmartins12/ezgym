import type { MuscleGroup } from '../shared/muscle-group';

/**
 * Junction row between a workout and the exercise catalog.
 * The denormalized fields (exercise_name, muscle_group, equipment,
 * notes) are read-model projections filled by joins — they are not
 * persisted by every writer.
 */
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
  equipment?: string;
  notes?: string;
}
