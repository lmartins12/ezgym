import { inject, Injectable } from '@angular/core';
import { DatabaseService } from '@core/services/database.service';
import type {
  ExercisePR,
  FrequentWorkout,
  MuscleDistribution,
  WorkoutStats,
} from '../models/progress.models';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly dbService = inject(DatabaseService);

  async getWorkoutStats(): Promise<WorkoutStats> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const completedSessions = await db.workout_sessions
      .filter((s) => s.finished_at != null)
      .toArray();

    const totalWorkouts = completedSessions.length;

    if (totalWorkouts === 0) {
      return {
        totalWorkouts: 0,
        totalVolume: 0,
        averageWeeklyFrequency: 0,
        currentStreak: 0,
        lastWorkoutDate: null,
      };
    }

    const sessionIds = completedSessions.map((s) => s.id);
    const setLogs = await db.set_logs
      .where('session_id')
      .anyOf(sessionIds)
      .toArray();

    // Total volume (sum of weight * reps)
    const totalVolume = setLogs.reduce((sum, log) => {
      if (log.weight != null && log.reps != null) {
        return sum + log.weight * log.reps;
      }
      return sum;
    }, 0);

    // Average weekly frequency
    const minStartedAt = Math.min(
      ...completedSessions.map((s) => s.started_at),
    );
    const now = Date.now();
    const totalDays = Math.max(1, (now - minStartedAt) / (1000 * 60 * 60 * 24));
    const weeks = Math.max(1, totalDays / 7);
    const averageWeeklyFrequency =
      Math.round((totalWorkouts / weeks) * 10) / 10;

    // Current streak (consecutive days)
    const dates = completedSessions
      .map((s) => s.started_at)
      .sort((a, b) => b - a);

    const currentStreak = this.calculateStreak(dates);

    // Last workout date
    const lastWorkoutDate = Math.max(
      ...completedSessions.map((s) => s.started_at),
    );

    return {
      totalWorkouts,
      totalVolume,
      averageWeeklyFrequency,
      currentStreak,
      lastWorkoutDate,
    };
  }

  async getFrequentWorkouts(limit: number = 5): Promise<FrequentWorkout[]> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const completedSessions = await db.workout_sessions
      .filter((s) => s.finished_at != null)
      .toArray();

    if (completedSessions.length === 0) return [];

    // Group sessions by workout_id
    const workoutStatsMap = new Map<
      string,
      { count: number; lastWorkout: number }
    >();

    for (const session of completedSessions) {
      const existing = workoutStatsMap.get(session.workout_id) ?? {
        count: 0,
        lastWorkout: 0,
      };
      existing.count++;
      if (session.started_at > existing.lastWorkout) {
        existing.lastWorkout = session.started_at;
      }
      workoutStatsMap.set(session.workout_id, existing);
    }

    const workoutIds = Array.from(workoutStatsMap.keys());
    const workouts = await db.workouts.where('id').anyOf(workoutIds).toArray();
    const workoutMap = new Map(workouts.map((w) => [w.id, w]));

    const result: FrequentWorkout[] = [];
    for (const [workoutId, stats] of workoutStatsMap.entries()) {
      const workout = workoutMap.get(workoutId);
      if (!workout) continue;
      result.push({
        id: workout.id,
        name: workout.name,
        muscleGroup: workout.muscle_group as any,
        count: stats.count,
        lastWorkout: stats.lastWorkout,
      });
    }

    return result.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  async getExercisePRs(): Promise<ExercisePR[]> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const completedSessions = await db.workout_sessions
      .filter((s) => s.finished_at != null)
      .toArray();

    if (completedSessions.length === 0) return [];

    const sessionMap = new Map(completedSessions.map((s) => [s.id, s]));
    const sessionIds = Array.from(sessionMap.keys());

    const setLogs = await db.set_logs
      .where('session_id')
      .anyOf(sessionIds)
      .toArray();

    // Map highest PR per exercise
    const prMap = new Map<string, { prWeight: number; prDate: number }>();

    for (const log of setLogs) {
      if (log.weight == null || log.weight <= 0) continue;
      const session = sessionMap.get(log.session_id);
      if (!session) continue;

      const existing = prMap.get(log.exercise_id);
      if (!existing || log.weight > existing.prWeight) {
        prMap.set(log.exercise_id, {
          prWeight: log.weight,
          prDate: session.started_at,
        });
      }
    }

    const exerciseIds = Array.from(prMap.keys());
    if (exerciseIds.length === 0) return [];

    const exercises = await db.exercises
      .where('id')
      .anyOf(exerciseIds)
      .toArray();
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    const results: ExercisePR[] = [];
    for (const [exerciseId, pr] of prMap.entries()) {
      const ex = exerciseMap.get(exerciseId);
      if (!ex) continue;
      results.push({
        exerciseId,
        exerciseName: ex.name,
        muscleGroup: ex.muscle_group as any,
        equipment: ex.equipment ?? null,
        prWeight: pr.prWeight,
        prDate: pr.prDate,
      });
    }

    return results.sort((a, b) => b.prWeight - a.prWeight);
  }

  async getMuscleDistribution(): Promise<MuscleDistribution[]> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const completedSessions = await db.workout_sessions
      .filter((s) => s.finished_at != null)
      .toArray();

    if (completedSessions.length === 0) return [];

    const workoutIds = Array.from(
      new Set(completedSessions.map((s) => s.workout_id)),
    );
    const workouts = await db.workouts.where('id').anyOf(workoutIds).toArray();
    const workoutMap = new Map(workouts.map((w) => [w.id, w]));

    const countMap = new Map<string, number>();
    let total = 0;

    for (const session of completedSessions) {
      const workout = workoutMap.get(session.workout_id);
      if (workout?.muscle_group) {
        const current = countMap.get(workout.muscle_group) ?? 0;
        countMap.set(workout.muscle_group, current + 1);
        total++;
      }
    }

    const results: MuscleDistribution[] = [];
    for (const [muscleGroup, count] of countMap.entries()) {
      results.push({
        muscleGroup: muscleGroup as any,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }

  private calculateStreak(dates: number[]): number {
    if (dates.length === 0) return 0;

    const msPerDay = 24 * 60 * 60 * 1000;

    // Normalize dates to midnight local time
    const normalizedDates = Array.from(
      new Set(
        dates.map((d) => {
          const date = new Date(d);
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
          ).getTime();
        }),
      ),
    ).sort((a, b) => b - a);

    if (normalizedDates.length === 0) return 0;

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    // Check if the most recent workout is today or yesterday
    const mostRecent = normalizedDates[0];
    const daysSinceLastWorkout = Math.floor((today - mostRecent) / msPerDay);

    if (daysSinceLastWorkout > 1) {
      return 0; // Streak broken
    }

    let streak = 1;

    for (let i = 0; i < normalizedDates.length - 1; i++) {
      const current = normalizedDates[i];
      const next = normalizedDates[i + 1];
      const dayDiff = Math.round((current - next) / msPerDay);

      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
