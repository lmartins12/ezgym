import type { MuscleGroup } from '../shared/muscle-group';

/**
 * Workout execution. `workout_name`/`muscle_group` are read-model
 * projections filled by joins — not persisted by every writer.
 */
export interface WorkoutSession {
  id: string;
  workout_id: string;
  started_at: number;
  status?: 'IN_PROGRESS' | 'COMPLETED';
  finished_at?: number;
  notes?: string;
  workout_name?: string;
  muscle_group?: MuscleGroup;
}
