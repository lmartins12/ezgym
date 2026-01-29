import { Injectable } from '@angular/core';
import { DatabaseService } from '@core';
import type { ExercisePR, FrequentWorkout, MuscleDistribution, WorkoutStats } from '../models';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  constructor(private readonly db: DatabaseService) {}

  async getWorkoutStats(): Promise<WorkoutStats> {
    await this.db.ready();

    // Total workouts (completed)
    const totalWorkoutsResult = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM workout_sessions WHERE finished_at IS NOT NULL`,
    );
    const totalWorkouts = totalWorkoutsResult[0]?.count ?? 0;

    // Total volume (sum of weight × reps for all completed sessions)
    const totalVolumeResult = await this.db.query<{ volume: number }>(
      `SELECT SUM(sl.weight * sl.reps) as volume
       FROM set_logs sl
       JOIN workout_sessions ws ON sl.session_id = ws.id
       WHERE ws.finished_at IS NOT NULL AND sl.weight IS NOT NULL`,
    );
    const totalVolume = totalVolumeResult[0]?.volume ?? 0;

    // Average weekly frequency
    const frequencyResult = await this.db.query<{
      weeks: number;
      sessions: number;
    }>(
      `SELECT
        CAST((julianday('now') - julianday(min_started_at)) / 7 AS INTEGER) as weeks,
        COUNT(*) as sessions
       FROM (
         SELECT MIN(started_at) as min_started_at
         FROM workout_sessions
         WHERE finished_at IS NOT NULL
       )`,
    );
    const weeks = frequencyResult[0]?.weeks ?? 1;
    const sessions = frequencyResult[0]?.sessions ?? totalWorkouts;
    const averageWeeklyFrequency =
      weeks > 0 ? Math.round((sessions / weeks) * 10) / 10 : 0;

    // Current streak (consecutive days with at least one workout)
    const streakResult = await this.db.query<{ streak_date: number }>(
      `SELECT DISTINCT started_at as streak_date
       FROM workout_sessions
       WHERE finished_at IS NOT NULL
       ORDER BY started_at DESC`,
    );

    const currentStreak = this.calculateStreak(
      streakResult.map((r) => r.streak_date),
    );

    // Last workout date
    const lastWorkoutResult = await this.db.query<{ last_date: number }>(
      `SELECT MAX(started_at) as last_date
       FROM workout_sessions
       WHERE finished_at IS NOT NULL`,
    );
    const lastWorkoutDate = lastWorkoutResult[0]?.last_date ?? null;

    return {
      totalWorkouts,
      totalVolume,
      averageWeeklyFrequency,
      currentStreak,
      lastWorkoutDate,
    };
  }

  async getFrequentWorkouts(limit: number = 5): Promise<FrequentWorkout[]> {
    await this.db.ready();

    const result = await this.db.query<{
      id: string;
      name: string;
      muscle_group: string | null;
      count: number;
      last_workout: number;
    }>(
      `SELECT
        w.id,
        w.name,
        w.muscle_group,
        COUNT(ws.id) as count,
        MAX(ws.started_at) as last_workout
       FROM workout_sessions ws
       JOIN workouts w ON ws.workout_id = w.id
       WHERE ws.finished_at IS NOT NULL
       GROUP BY w.id
       ORDER BY count DESC
       LIMIT ?`,
      [limit],
    );

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      muscleGroup: row.muscle_group as any,
      count: row.count,
      lastWorkout: row.last_workout,
    }));
  }

  async getExercisePRs(): Promise<ExercisePR[]> {
    await this.db.ready();

    const result = await this.db.query<{
      exercise_id: string;
      exercise_name: string;
      muscle_group: string | null;
      equipment: string | null;
      pr_weight: number;
      pr_date: number;
    }>(
      `SELECT
        e.id as exercise_id,
        e.name as exercise_name,
        e.muscle_group,
        e.equipment,
        MAX(sl.weight) as pr_weight,
        MAX(ws.started_at) as pr_date
       FROM set_logs sl
       JOIN exercises e ON sl.exercise_id = e.id
       JOIN workout_sessions ws ON sl.session_id = ws.id
       WHERE ws.finished_at IS NOT NULL AND sl.weight IS NOT NULL
       GROUP BY e.id
       ORDER BY pr_weight DESC`,
    );

    return result.map((row) => ({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      muscleGroup: row.muscle_group as any,
      equipment: row.equipment,
      prWeight: row.pr_weight,
      prDate: row.pr_date,
    }));
  }

  async getMuscleDistribution(): Promise<MuscleDistribution[]> {
    await this.db.ready();

    const result = await this.db.query<{
      muscle_group: string;
      count: number;
    }>(
      `SELECT
        w.muscle_group,
        COUNT(*) as count
       FROM workout_sessions ws
       JOIN workouts w ON ws.workout_id = w.id
       WHERE ws.finished_at IS NOT NULL AND w.muscle_group IS NOT NULL
       GROUP BY w.muscle_group
       ORDER BY count DESC`,
    );

    // Get total count for percentage calculation
    const total = result.reduce((sum, row) => sum + row.count, 0);

    return result.map((row) => ({
      muscleGroup: row.muscle_group as any,
      count: row.count,
      percentage: total > 0 ? Math.round((row.count / total) * 100) : 0,
    }));
  }

  private calculateStreak(dates: number[]): number {
    if (dates.length === 0) return 0;

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Convert Unix timestamps (seconds) to milliseconds and normalize to start of day
    const normalizedDates = dates
      .map((d) => {
        const date = new Date(d * 1000);
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ).getTime();
      })
      .sort((a, b) => b - a); // Sort descending (newest first)

    let streak = 0;
    const currentDate = new Date(now);
    const currentTimestamp = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
    ).getTime();

    // Check if the most recent workout is within the last 2 days (today or yesterday)
    const mostRecent = normalizedDates[0];
    const daysSinceLastWorkout = Math.floor(
      (currentTimestamp - mostRecent) / msPerDay,
    );

    if (daysSinceLastWorkout > 1) {
      return 0; // Streak broken
    }

    streak = 1;

    // Count consecutive days going backwards
    for (let i = 0; i < normalizedDates.length - 1; i++) {
      const current = normalizedDates[i];
      const next = normalizedDates[i + 1];
      const dayDiff = Math.floor((current - next) / msPerDay);

      if (dayDiff === 1) {
        streak++;
      } else if (dayDiff === 0) {
        // Same day, multiple workouts - don't increment
        continue;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  }
}
