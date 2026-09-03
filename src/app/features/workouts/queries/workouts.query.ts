import { inject, Injectable } from '@angular/core';
import { SessionRepository } from '@domain/sessions/session.repository';
import { WorkoutRepository } from '@domain/workouts/workout.repository';
import type { WorkoutDetail } from '../models/workout-detail.models';

/**
 * Read-model for the workouts list: workouts enriched with the
 * exercise count and the last-trained timestamp, sorted by
 * order_index ASC then updated_at DESC. Pure queries — writes stay
 * in the facade.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutsQuery {
  private readonly workoutRepository = inject(WorkoutRepository);
  private readonly sessionRepository = inject(SessionRepository);

  public async list(): Promise<WorkoutDetail[]> {
    const [workouts, exerciseCountMap, lastTrainedMap] = await Promise.all([
      this.workoutRepository.getAll(),
      this.workoutRepository.getExerciseCountMap(),
      this.sessionRepository.getLastTrainedMap(),
    ]);

    const details: WorkoutDetail[] = workouts.map((w) => ({
      ...w,
      order_index: w.order_index ?? 0,
      exercise_count: exerciseCountMap.get(w.id) ?? 0,
      last_trained: lastTrainedMap.get(w.id) ?? undefined,
    }));

    return details.sort((a, b) => {
      const orderA = a.order_index ?? 0;
      const orderB = b.order_index ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (b.updated_at ?? 0) - (a.updated_at ?? 0);
    });
  }
}
