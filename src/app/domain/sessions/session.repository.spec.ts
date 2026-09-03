import { db } from '@core/db/app-db';
import {
  buildSession,
  buildSetLog,
  injectService,
  resetDatabase,
} from '@testing/db-test-helpers';
import { SessionRepository } from './session.repository';

describe('SessionRepository', () => {
  let service: SessionRepository;

  beforeEach(async () => {
    await resetDatabase();
    service = injectService(SessionRepository);
  });

  describe('getById', () => {
    it('returns the session or null', async () => {
      const session = buildSession();
      await db.workout_sessions.add(session);

      await expect(service.getById(session.id)).resolves.toMatchObject({
        id: session.id,
      });
      await expect(service.getById('missing')).resolves.toBeNull();
    });
  });

  describe('getMostRecentActive', () => {
    it('returns null when there is no active session', async () => {
      await db.workout_sessions.add(buildSession({ status: 'COMPLETED' }));

      await expect(service.getMostRecentActive()).resolves.toBeNull();
    });

    it('returns the single active session', async () => {
      const active = buildSession({ status: 'IN_PROGRESS' });
      await db.workout_sessions.bulkAdd([
        active,
        buildSession({ status: 'COMPLETED' }),
      ]);

      await expect(service.getMostRecentActive()).resolves.toMatchObject({
        id: active.id,
      });
    });

    it('adopts the most recent one when legacy data has duplicates', async () => {
      const older = buildSession({
        status: 'IN_PROGRESS',
        started_at: 1000,
      });
      const newer = buildSession({
        status: 'IN_PROGRESS',
        started_at: 2000,
      });
      await db.workout_sessions.bulkAdd([older, newer]);

      await expect(service.getMostRecentActive()).resolves.toMatchObject({
        id: newer.id,
      });
    });
  });

  describe('getActiveByWorkoutId', () => {
    it('returns the active session of the workout or null', async () => {
      const active = buildSession({
        workout_id: 'w-1',
        status: 'IN_PROGRESS',
      });
      await db.workout_sessions.bulkAdd([
        active,
        buildSession({ workout_id: 'w-2', status: 'IN_PROGRESS' }),
        buildSession({ workout_id: 'w-1', status: 'COMPLETED' }),
      ]);

      await expect(service.getActiveByWorkoutId('w-1')).resolves.toMatchObject({
        id: active.id,
      });
      await expect(service.getActiveByWorkoutId('w-9')).resolves.toBeNull();
    });
  });

  describe('getByStartedAtRange / countByStartedAtRange', () => {
    it('paginates desc by started_at within the range', async () => {
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: 1000 }),
        buildSession({ started_at: 2000 }),
        buildSession({ started_at: 3000 }),
        buildSession({ started_at: 4000 }),
      ]);

      const page = await service.getByStartedAtRange(1500, 3500, 0, 10);

      expect(page.map((s) => s.started_at)).toEqual([3000, 2000]);
      await expect(service.countByStartedAtRange(1500, 3500)).resolves.toBe(2);
    });

    it('supports open ranges with offset/limit', async () => {
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: 1000 }),
        buildSession({ started_at: 2000 }),
        buildSession({ started_at: 3000 }),
      ]);

      const page = await service.getByStartedAtRange(null, null, 1, 1);

      expect(page.map((s) => s.started_at)).toEqual([2000]);
      await expect(service.countByStartedAtRange(null, null)).resolves.toBe(3);
    });
  });

  describe('getEventDates / getAllEventDates', () => {
    it('returns unique started_at desc', async () => {
      await db.workout_sessions.bulkAdd([
        buildSession({ started_at: 1000 }),
        buildSession({ started_at: 1000 }),
        buildSession({ started_at: 3000 }),
        buildSession({ started_at: 2000 }),
      ]);

      await expect(service.getEventDates(500, 2500)).resolves.toEqual([
        2000, 1000,
      ]);
      await expect(service.getAllEventDates()).resolves.toEqual([
        3000, 2000, 1000,
      ]);
    });
  });

  describe('logs', () => {
    it('sorts logs by set_number and streams them per session', async () => {
      const session = buildSession();
      await db.workout_sessions.add(session);
      await db.set_logs.bulkAdd([
        buildSetLog({ session_id: session.id, set_number: 2 }),
        buildSetLog({ session_id: session.id, set_number: 1 }),
        buildSetLog({ session_id: 'other', set_number: 0 }),
      ]);

      const logs = await service.getLogsBySession(session.id);
      expect(logs.map((l) => l.set_number)).toEqual([1, 2]);

      const seen: string[] = [];
      await service.forEachLogOfSessions([session.id], (log) =>
        seen.push(log.id),
      );
      expect(seen).toHaveLength(2);

      await expect(
        service.forEachLogOfSessions([], () => {
          throw new Error('should not be called');
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteWithLogs / deleteByWorkoutId', () => {
    it('deletes a session together with its logs atomically', async () => {
      const session = buildSession();
      await db.workout_sessions.add(session);
      await db.set_logs.bulkAdd([
        buildSetLog({ session_id: session.id }),
        buildSetLog({ session_id: 'other' }),
      ]);

      await service.deleteWithLogs(session.id);

      await expect(service.getById(session.id)).resolves.toBeNull();
      await expect(service.getLogsBySession(session.id)).resolves.toEqual([]);
      await expect(service.getLogsBySession('other')).resolves.toHaveLength(1);
    });

    it('deletes every session of a workout with their logs', async () => {
      await db.workout_sessions.bulkAdd([
        buildSession({ id: 's-1', workout_id: 'w-1' }),
        buildSession({ id: 's-2', workout_id: 'w-1' }),
        buildSession({ id: 's-3', workout_id: 'w-2' }),
      ]);
      await db.set_logs.bulkAdd([
        buildSetLog({ session_id: 's-1' }),
        buildSetLog({ session_id: 's-2' }),
        buildSetLog({ session_id: 's-3' }),
      ]);

      await service.deleteByWorkoutId('w-1');

      await expect(service.getById('s-1')).resolves.toBeNull();
      await expect(service.getById('s-2')).resolves.toBeNull();
      await expect(service.getById('s-3')).resolves.not.toBeNull();
      await expect(service.getLogsBySession('s-3')).resolves.toHaveLength(1);
    });
  });
});
