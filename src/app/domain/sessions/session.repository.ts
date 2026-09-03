import { inject, Injectable } from '@angular/core';
import { db } from '@core/db/app-db';
import { DatabaseService } from '@core/db/database';
import { Dexie } from 'dexie';
import type { SetLog } from './set-log';
import type { WorkoutSession } from './workout-session';

/**
 * Persistence for the Session aggregate: workout sessions and their
 * set-log children, plus the indexed range queries used by history,
 * calendar and progress read-models.
 */
@Injectable({ providedIn: 'root' })
export class SessionRepository {
  private readonly database = inject(DatabaseService);

  public async getById(id: string): Promise<WorkoutSession | null> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    return (await db.workout_sessions.get(id)) ?? null;
  }

  /**
   * The active session is always the most recent one (started_at desc).
   * Legacy data may hold more than one IN_PROGRESS session (e.g. created
   * before the duplicate-start guard existed); the older ones stay orphaned
   * unless a user finalizes them, so we flag it for maintenance.
   */
  public async getMostRecentActive(): Promise<WorkoutSession | null> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const activeSessions = await db.workout_sessions
      .where('status')
      .equals('IN_PROGRESS')
      .toArray();

    if (activeSessions.length > 1) {
      console.warn(
        `[SessionRepository] Found ${activeSessions.length} active sessions; adopting the most recent one.`,
      );
    }

    activeSessions.sort((a, b) => b.started_at - a.started_at);
    return activeSessions[0] ?? null;
  }

  public async getActiveByWorkoutId(
    workoutId: string,
  ): Promise<WorkoutSession | null> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const active = await db.workout_sessions
      .where('status')
      .equals('IN_PROGRESS')
      .toArray();
    return active.find((s) => s.workout_id === workoutId) ?? null;
  }

  public async add(session: WorkoutSession): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.workout_sessions.add(session);
  }

  public async update(
    id: string,
    changes: Partial<WorkoutSession>,
  ): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.workout_sessions.update(id, changes);
  }

  public async delete(id: string): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.workout_sessions.delete(id);
  }

  /**
   * Deletes a session together with its set logs (atomic).
   */
  public async deleteWithLogs(sessionId: string): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.transaction('rw', [db.set_logs, db.workout_sessions], async () => {
      await db.set_logs.where('session_id').equals(sessionId).delete();
      await db.workout_sessions.delete(sessionId);
    });
  }

  /**
   * Deletes every session of a workout and their set logs (cascade,
   * used when the workout itself is deleted). Atomic.
   */
  public async deleteByWorkoutId(workoutId: string): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.transaction('rw', [db.set_logs, db.workout_sessions], async () => {
      const sessions = await db.workout_sessions
        .where('workout_id')
        .equals(workoutId)
        .toArray();
      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length === 0) return;

      await db.set_logs.where('session_id').anyOf(sessionIds).delete();
      await db.workout_sessions.where('workout_id').equals(workoutId).delete();
    });
  }

  /**
   * Last started_at per workout via cursor — no materialization.
   */
  public async getLastTrainedMap(): Promise<Map<string, number>> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const map = new Map<string, number>();
    await db.workout_sessions.each((session) => {
      const current = map.get(session.workout_id);
      if (!current || session.started_at > current) {
        map.set(session.workout_id, session.started_at);
      }
    });
    return map;
  }

  /**
   * Completed sessions via the indexed `status` field.
   */
  public async getCompleted(): Promise<WorkoutSession[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    return db.workout_sessions.where('status').equals('COMPLETED').toArray();
  }

  /**
   * Paginated sessions by started_at range (index-backed).
   * @param start Unix timestamp (ms) or null for no start limit
   * @param end Unix timestamp (ms) or null for no end limit
   */
  public async getByStartedAtRange(
    start: number | null,
    end: number | null,
    offset: number,
    limit: number,
  ): Promise<WorkoutSession[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    return db.workout_sessions
      .where('started_at')
      .between(start ?? Dexie.minKey, end ?? Dexie.maxKey, true, true)
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  public async countByStartedAtRange(
    start: number | null,
    end: number | null,
  ): Promise<number> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    return db.workout_sessions
      .where('started_at')
      .between(start ?? Dexie.minKey, end ?? Dexie.maxKey, true, true)
      .count();
  }

  /**
   * Unique started_at timestamps within a range (calendar highlighting).
   */
  public async getEventDates(start: number, end: number): Promise<number[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const keys = await db.workout_sessions
      .where('started_at')
      .between(start, end, true, true)
      .keys();

    return this.toUniqueDates(keys);
  }

  /**
   * Unique started_at timestamps across all time (calendar highlighting).
   */
  public async getAllEventDates(): Promise<number[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const keys = await db.workout_sessions.orderBy('started_at').keys();

    return this.toUniqueDates(keys);
  }

  // --- Child: SetLog ---

  /**
   * Set logs of one session, sorted by set_number.
   */
  public async getLogsBySession(sessionId: string): Promise<SetLog[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const logs = await db.set_logs
      .where('session_id')
      .equals(sessionId)
      .toArray();
    return logs.sort((a, b) => a.set_number - b.set_number);
  }

  /**
   * Streams set logs of many sessions through a callback — avoids
   * materializing every log (volume/PR aggregations).
   */
  public async forEachLogOfSessions(
    sessionIds: string[],
    each: (log: SetLog) => void,
  ): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    if (sessionIds.length === 0) return;
    await db.set_logs.where('session_id').anyOf(sessionIds).each(each);
  }

  public async addLog(log: SetLog): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.set_logs.add(log);
  }

  public async updateLog(id: string, changes: Partial<SetLog>): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.set_logs.update(id, changes);
  }

  public async deleteLog(id: string): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.set_logs.delete(id);
  }

  private toUniqueDates(keys: readonly unknown[]): number[] {
    const dates = Array.from(
      new Set(keys.filter((k): k is number => typeof k === 'number')),
    );
    return dates.sort((a, b) => b - a);
  }
}
