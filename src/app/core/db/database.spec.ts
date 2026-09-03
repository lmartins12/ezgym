import { db } from '@core/db/app-db';
import {
  buildWorkout,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from './database';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(DatabaseService);
  });

  it('initializes once and exposes readiness', async () => {
    expect(service.ready()).toBe(false);

    await service.initialize();
    await service.initialize();

    expect(service.ready()).toBe(true);
    expect(db.isOpen()).toBe(true);
  });

  it('runs writes inside a single atomic transaction', async () => {
    const result = await service.write(async () => {
      await db.workouts.add(buildWorkout({ id: 'w-atomic' }));
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(await db.workouts.count()).toBe(1);
  });

  it('rolls back every write when the transaction fails', async () => {
    await expect(
      service.write(async () => {
        await db.workouts.add(buildWorkout({ id: 'w-rollback' }));
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await db.workouts.count()).toBe(0);
  });

  it('wipes the database and reopens it empty', async () => {
    await db.workouts.add(buildWorkout());

    await service.wipe();

    expect(db.isOpen()).toBe(true);
    expect(service.ready()).toBe(true);
    expect(await db.workouts.count()).toBe(0);
  });

  it('closes the connection and clears readiness', async () => {
    await service.initialize();

    await service.close();

    expect(service.ready()).toBe(false);
    expect(db.isOpen()).toBe(false);
    await service.initialize();
  });
});
