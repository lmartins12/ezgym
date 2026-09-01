export type MuscleGroup =
  | 'upper'
  | 'lower'
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
  'upper',
  'lower',
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
