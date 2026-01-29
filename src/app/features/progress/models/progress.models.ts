import type { MuscleGroup } from '@core';

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
