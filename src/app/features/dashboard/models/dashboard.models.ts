import type { MuscleGroup } from '@domain/shared/muscle-group';

/**
 * Generic event type for dashboard cards.
 * Extensible for future event types (nutrition, sleep, etc.)
 */
export type DashboardEventType = 'workout' | 'nutrition' | 'sleep' | 'other';

/**
 * Generic dashboard event interface.
 * Uses discriminator pattern for type-specific data.
 */
export interface DashboardEvent {
  id: string;
  type: DashboardEventType;
  timestamp: number;
  title: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Workout-specific event data.
 */
export interface WorkoutEvent extends DashboardEvent {
  type: 'workout';
  workout_id: string;
  workout_name: string;
  muscle_group?: MuscleGroup;
  finished_at?: number;
  notes?: string;
}

/**
 * Date filter state.
 */
export interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
}

/**
 * Pagination state for infinite scroll.
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  totalLoaded: number;
}

/**
 * Individual set log in a session.
 */
export interface SessionSetLog {
  setNumber: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
}

/**
 * Exercise with its sets in a session.
 */
export interface SessionExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup | null;
  equipment: string | null;
  sets: SessionSetLog[];
}

/**
 * Complete session detail for modal display.
 */
export interface SessionDetail {
  sessionId: string;
  workoutName: string;
  muscleGroup: MuscleGroup | null;
  startedAt: number;
  finishedAt: number | null;
  notes: string | null;
  exercises: SessionExercise[];
}
