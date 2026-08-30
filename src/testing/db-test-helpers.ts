import { TestBed } from '@angular/core/testing';
import { db } from '@core/services/app-db';
import type {
  Exercise,
  SetLog,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '@core/models/app-models';

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

export function buildExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: nextId('ex'),
    name: 'Bench Press',
    muscle_group: 'chest',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

export function buildWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: nextId('w'),
    name: 'Push Day',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

export function buildWorkoutExercise(
  overrides: Partial<WorkoutExercise> = {},
): WorkoutExercise {
  return {
    id: nextId('we'),
    workout_id: 'w-1',
    exercise_id: 'ex-1',
    order_index: 0,
    sets: 3,
    reps: '10',
    rest_seconds: 60,
    ...overrides,
  };
}

export function buildSession(
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  return {
    id: nextId('s'),
    workout_id: 'w-1',
    started_at: Date.now(),
    status: 'COMPLETED',
    ...overrides,
  };
}

export function buildSetLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: nextId('log'),
    session_id: 's-1',
    exercise_id: 'ex-1',
    set_number: 1,
    reps: 10,
    weight: 50,
    completed_at: Date.now(),
    ...overrides,
  };
}

/**
 * Wipes the fake IndexedDB between tests and reopens the Dexie
 * singleton (it does not auto-reopen after delete()).
 */
export async function resetDatabase(): Promise<void> {
  await db.delete();
  await db.open();
}

export function injectService<T>(token: new () => T): T {
  return TestBed.inject(token);
}
