import Dexie from 'dexie';
import { db, EzGymDatabase } from './app-db';

/**
 * Mirrors the version(1) schema verbatim (see the convention comment in
 * app-db.ts). If this spec fails with an upgrade/index error, version(1)
 * was edited — which is forbidden because existing users already have it.
 */
const V1_STORES = {
  exercises: 'id, name, muscle_group, created_at, updated_at',
  workouts: 'id, name, order_index, created_at, updated_at',
  workout_exercises: 'id, workout_id, exercise_id, order_index',
  workout_sessions: 'id, workout_id, status, started_at, finished_at',
  set_logs: 'id, session_id, exercise_id, set_number, completed_at',
};

describe('EzGymDatabase migrations', () => {
  it('upgrades a database created on version(1) without losing data', async () => {
    // Reference: the version a fresh install gets
    await db.delete();
    const fresh = new EzGymDatabase();
    await fresh.open();
    const currentVersion = fresh.verno;
    fresh.close();
    await fresh.delete();

    // Seed a legacy database pinned to version(1)
    const legacy = new Dexie('ezgym_db');
    legacy.version(1).stores(V1_STORES);
    await legacy.open();
    await legacy.table('workouts').add({
      id: 'w-legacy',
      name: 'Legacy Workout',
      created_at: 1,
      updated_at: 1,
    });
    await legacy.table('set_logs').add({
      id: 'log-legacy',
      session_id: 's-legacy',
      exercise_id: 'ex-legacy',
      set_number: 1,
      reps: 10,
      weight: 50,
      completed_at: 1,
    });
    legacy.close();

    // Opening the current schema must preserve the legacy rows
    await db.open();

    expect(db.verno).toBe(currentVersion);
    expect(await db.workouts.get('w-legacy')).toMatchObject({
      name: 'Legacy Workout',
    });
    expect(await db.set_logs.get('log-legacy')).toMatchObject({
      reps: 10,
      weight: 50,
    });
  });
});
