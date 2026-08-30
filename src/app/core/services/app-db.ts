import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  SetLog,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from '../models/app-models';

export class EzGymDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  workouts!: Table<Workout, string>;
  workout_exercises!: Table<WorkoutExercise, string>;
  workout_sessions!: Table<WorkoutSession, string>;
  set_logs!: Table<SetLog, string>;

  constructor() {
    super('ezgym_db');

    this.version(1).stores({
      exercises: 'id, name, muscle_group, created_at, updated_at',
      workouts: 'id, name, order_index, created_at, updated_at',
      workout_exercises: 'id, workout_id, exercise_id, order_index',
      workout_sessions: 'id, workout_id, status, started_at, finished_at',
      set_logs: 'id, session_id, exercise_id, set_number, completed_at',
    });
  }
}

export const db = new EzGymDatabase();
