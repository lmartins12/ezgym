import type { MuscleGroup } from '../shared/muscle-group';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment?: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}
