import { TestBed } from '@angular/core/testing';
import { db } from '@core/db/app-db';
import {
  buildExercise,
  buildSession,
  buildSetLog,
  buildWorkout,
  buildWorkoutExercise,
} from '@testing/db-test-helpers';
import { DataWipeService } from './data-wipe';

describe('DataWipeService', () => {
  let service: DataWipeService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataWipeService);
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  async function seedAllTables(): Promise<void> {
    await db.exercises.add(buildExercise());
    await db.workouts.add(buildWorkout());
    await db.workout_exercises.add(buildWorkoutExercise());
    await db.workout_sessions.add(buildSession());
    await db.set_logs.add(buildSetLog());
  }

  it('deletes every table and reopens the database', async () => {
    await seedAllTables();

    await service.wipeAll();

    expect(db.isOpen()).toBe(true);
    expect(await db.exercises.count()).toBe(0);
    expect(await db.workouts.count()).toBe(0);
    expect(await db.workout_exercises.count()).toBe(0);
    expect(await db.workout_sessions.count()).toBe(0);
    expect(await db.set_logs.count()).toBe(0);
  });

  it('removes app preferences from localStorage', async () => {
    localStorage.setItem('app_theme', 'light');
    localStorage.setItem('app_language', 'en');
    localStorage.setItem('app_onboarding_seen', 'true');
    localStorage.setItem('app_pwa_visits', '3');
    localStorage.setItem('app_pwa_install_dismissed', 'true');

    await service.wipeAll();

    expect(localStorage.getItem('app_theme')).toBeNull();
    expect(localStorage.getItem('app_language')).toBeNull();
    expect(localStorage.getItem('app_onboarding_seen')).toBeNull();
    expect(localStorage.getItem('app_pwa_visits')).toBeNull();
    expect(localStorage.getItem('app_pwa_install_dismissed')).toBeNull();
  });

  it('keeps localStorage keys not owned by the app', async () => {
    localStorage.setItem('other_key', 'keep-me');

    await service.wipeAll();

    expect(localStorage.getItem('other_key')).toBe('keep-me');
  });

  it('works on an already empty database', async () => {
    await service.wipeAll();

    expect(db.isOpen()).toBe(true);
    expect(await db.workouts.count()).toBe(0);
  });
});
