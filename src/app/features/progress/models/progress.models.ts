import type { MuscleGroup } from '@domain/shared/muscle-group';

export interface WorkoutStats {
  totalWorkouts: number;
  totalVolume: number;
  averageWeeklyFrequency: number;
  currentStreak: number;
  lastWorkoutDate: number | null;
}

export interface FrequentWorkout {
  id: string;
  name: string;
  muscleGroup: MuscleGroup | null;
  count: number;
  lastWorkout: number;
}

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup | null;
  equipment: string | null;
  prWeight: number;
  prDate: number;
}

export interface MuscleDistribution {
  muscleGroup: MuscleGroup;
  count: number;
  percentage: number;
}

/**
 * All Progress tab sections resolved from a single completed-sessions read.
 */
export interface ProgressSnapshot {
  stats: WorkoutStats;
  frequentWorkouts: FrequentWorkout[];
  exercisePRs: ExercisePR[];
  muscleDistribution: MuscleDistribution[];
}
