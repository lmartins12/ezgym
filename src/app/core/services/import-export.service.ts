import { inject, Injectable } from '@angular/core';
import type { MuscleGroup, Workout } from '../models/app-models';
import {
  EXPORT_VERSION,
  ValidationWarningType,
  type ExportData,
  type ExportExercise,
  type ExportWorkout,
  type ImportPreview,
  type ImportResult,
  type ValidationWarning,
} from '../models/import-export.models';
import { DatabaseService } from './database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly dbService = inject(DatabaseService);

  /**
   * Export all workouts as JSON string
   */
  public async exportWorkouts(): Promise<string> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    const [workouts, workoutExercises, exercises] = await Promise.all([
      db.workouts.toArray(),
      db.workout_exercises.toArray(),
      db.exercises.toArray(),
    ]);

    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    // Group workout exercises by workout_id
    const weByWorkout = new Map<string, typeof workoutExercises>();
    for (const we of workoutExercises) {
      const list = weByWorkout.get(we.workout_id) ?? [];
      list.push(we);
      weByWorkout.set(we.workout_id, list);
    }

    const sortedWorkouts = workouts.sort((a, b) => {
      const orderA = a.order_index ?? 0;
      const orderB = b.order_index ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.created_at ?? 0) - (b.created_at ?? 0);
    });

    const exportWorkouts: ExportWorkout[] = [];

    for (const workout of sortedWorkouts) {
      const weList = weByWorkout.get(workout.id) ?? [];
      weList.sort((a, b) => a.order_index - b.order_index);

      exportWorkouts.push({
        name: workout.name,
        description: workout.description || undefined,
        muscle_group: workout.muscle_group || undefined,
        exercises: weList.map((we) => {
          const ex = exerciseMap.get(we.exercise_id);
          return {
            exercise_name: ex?.name ?? 'Unknown Exercise',
            muscle_group: (ex?.muscle_group ?? 'other') as MuscleGroup,
            equipment: ex?.equipment || undefined,
            notes: ex?.notes || undefined,
            order_index: we.order_index,
            sets: we.sets,
            reps: we.reps,
            rest_seconds: we.rest_seconds,
            target_weight: we.target_weight ?? undefined,
          };
        }),
      });
    }

    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exported_at: Date.now(),
      app_version: '1.0.0',
      workouts: exportWorkouts,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Copy JSON to clipboard (Web API)
   */
  public async copyToClipboard(json: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(json);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = json;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Share JSON using Web Share API or download fallback
   */
  public async shareJson(
    json: string,
    filename = 'ezgym-workouts.json',
  ): Promise<void> {
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ text: json })
    ) {
      try {
        await navigator.share({
          title: 'EzGym Workouts Export',
          text: json,
        });
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback: Download file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get JSON from clipboard (Web API)
   */
  public async getFromClipboard(): Promise<{ value: string } | null> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        return { value: text };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Import workouts from JSON string
   */
  public async importWorkouts(json: string): Promise<ImportResult> {
    await this.dbService.initialize();
    const db = this.dbService.db;

    try {
      const data: ExportData = JSON.parse(json);
      let exercisesCreated = 0;
      let exercisesReused = 0;
      let workoutsImported = 0;

      await db.transaction(
        'rw',
        [db.workouts, db.exercises, db.workout_exercises],
        async () => {
          const existingWorkouts = await db.workouts.toArray();
          let currentMaxOrder = existingWorkouts.reduce(
            (max, w) => Math.max(max, w.order_index ?? 0),
            -1,
          );

          for (const workoutData of data.workouts) {
            currentMaxOrder++;
            const workoutId = uuidv4();
            const now = Date.now();

            const newWorkout: Workout = {
              id: workoutId,
              name: workoutData.name,
              description: workoutData.description || undefined,
              muscle_group: workoutData.muscle_group || undefined,
              order_index: currentMaxOrder,
              created_at: now,
              updated_at: now,
            };

            await db.workouts.add(newWorkout);
            workoutsImported++;

            for (const exerciseData of workoutData.exercises) {
              const { exerciseId, isNew } =
                await this.findOrCreateExercise(exerciseData);
              if (isNew) {
                exercisesCreated++;
              } else {
                exercisesReused++;
              }

              const workoutExerciseId = uuidv4();
              await db.workout_exercises.add({
                id: workoutExerciseId,
                workout_id: workoutId,
                exercise_id: exerciseId,
                order_index: exerciseData.order_index,
                sets: exerciseData.sets,
                reps: exerciseData.reps,
                rest_seconds: exerciseData.rest_seconds,
                target_weight: exerciseData.target_weight ?? undefined,
              });
            }
          }
        },
      );

      return {
        success: true,
        workoutsImported,
        exercisesCreated,
        exercisesReused,
      };
    } catch (error) {
      return {
        success: false,
        workoutsImported: 0,
        exercisesCreated: 0,
        exercisesReused: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get import preview data
   */
  public async getImportPreview(json: string): Promise<ImportPreview | null> {
    try {
      const data: ExportData = JSON.parse(json);
      const existingExercises = await this.getExistingExerciseNames();
      const newExercisesSet = new Set<string>();
      const existingExercisesSet = new Set<string>();
      const warnings: ValidationWarning[] = [];

      for (const workout of data.workouts) {
        if (workout.exercises.length === 0) {
          warnings.push({
            type: ValidationWarningType.WORKOUT_WITHOUT_EXERCISES,
            workoutIndex: data.workouts.indexOf(workout),
            workoutName: workout.name,
            message: 'WORKOUT_WITHOUT_EXERCISES',
          });
        }

        for (const exercise of workout.exercises) {
          const normalizedName = exercise.exercise_name.toLowerCase();
          if (existingExercises.has(normalizedName)) {
            existingExercisesSet.add(exercise.exercise_name);
          } else {
            newExercisesSet.add(exercise.exercise_name);
          }
        }
      }

      return {
        workoutCount: data.workouts.length,
        newExercises: Array.from(newExercisesSet),
        existingExercises: Array.from(existingExercisesSet),
        warnings,
      };
    } catch {
      return null;
    }
  }

  private async findOrCreateExercise(
    exerciseData: ExportExercise,
  ): Promise<{ exerciseId: string; isNew: boolean }> {
    const db = this.dbService.db;
    const normalizedName = exerciseData.exercise_name.trim().toLowerCase();

    const allExercises = await db.exercises.toArray();
    const existing = allExercises.find(
      (e) => e.name.trim().toLowerCase() === normalizedName,
    );

    if (existing) {
      return { exerciseId: existing.id, isNew: false };
    }

    const id = uuidv4();
    const now = Date.now();

    await db.exercises.add({
      id,
      name: exerciseData.exercise_name.trim(),
      muscle_group: exerciseData.muscle_group,
      equipment: exerciseData.equipment || undefined,
      notes: exerciseData.notes || undefined,
      created_at: now,
      updated_at: now,
    });

    return { exerciseId: id, isNew: true };
  }

  private async getExistingExerciseNames(): Promise<Set<string>> {
    await this.dbService.initialize();
    const exercises = await this.dbService.db.exercises.toArray();
    return new Set(exercises.map((e) => e.name.toLowerCase()));
  }

  /**
   * Get the prompt text for AI-assisted workout creation/conversion
   */
  public getPromptText(): string {
    return `You are a specialized assistant for creating and converting workouts for the EzGym app. Create a valid JSON following EXACTLY this format:

{
  "version": "1.0",
  "exported_at": <current_timestamp_in_milliseconds>,
  "workouts": [
    {
      "name": "Workout Name",
      "description": "Optional description",
      "muscle_group": "chest | triceps | back | biceps | shoulders | upper | lower | quadriceps | hamstrings | calves | forearms | abs | cardio | other",
      "exercises": [
        {
          "exercise_name": "Exercise Name",
          "muscle_group": "chest",
          "equipment": "Barbell, Dumbbells, Machine, etc. (optional)",
          "notes": "Notes about the exercise (optional)",
          "order_index": 0,
          "sets": 3,
          "reps": "12" or "8-10" (single or range format),
          "rest_seconds": 60,
          "target_weight": 20 (optional, in kg)
        }
      ]
    }
  ]
}

REQUIRED FIELDS:
- version: always "1.0"
- exported_at: current timestamp in milliseconds
- workouts: array with at least 1 workout
- name: workout name
- exercises: array with exercises
- exercise_name: exercise name
- muscle_group: one of the values listed above
- order_index: unique number per exercise (0, 1, 2...)
- sets: 1-20
- reps: format "12" or "8-10"
- rest_seconds: 0-600

VALID VALUES FOR muscle_group:
- chest (Chest)
- triceps (Triceps)
- back (Back)
- biceps (Biceps)
- shoulders (Shoulders)
- upper (Upper)
- lower (Lower)
- quadriceps (Quadriceps)
- hamstrings (Hamstrings)
- calves (Calves)
- forearms (Forearms)
- abs (Abs)
- cardio (Cardio)
- other (Other)

IMPORTANT:
- Generate a valid and complete JSON
- Use numeric values for sets, rest_seconds, and target_weight
- Use string for reps ("12" or "8-10")
- Each exercise must have a unique order_index within the workout
- Do not include extra fields beyond those listed
- Return ONLY the JSON, no additional text`;
  }
}
