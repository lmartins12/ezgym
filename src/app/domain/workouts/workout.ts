import type { MuscleGroup } from '../shared/muscle-group';

export interface Workout {
  id: string;
  name: string;
  description?: string;
  muscle_group?: MuscleGroup;
  order_index?: number;
  created_at: number;
  updated_at: number;
}
