import { inject, Injectable } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import type {
  ExportData,
  ExportExercise,
  ExportWorkout,
  ImportPreview,
  ImportResult,
} from '@core';
import {
  DatabaseService,
  EXPORT_VERSION,
  ValidationWarningType,
  type Exercise,
  type MuscleGroup,
} from '@core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly db = inject(DatabaseService);

  /**
   * Export all workouts as JSON string
   */
  public async exportWorkouts(): Promise<string> {
    await this.db.ready();

    // Get all workouts with their exercises
    const workouts = await this.db.query<{
      id: string;
      name: string;
      description: string | null;
      muscle_group: string | null;
    }>(
      `SELECT id, name, description, muscle_group
       FROM workouts
       ORDER BY order_index ASC, created_at ASC`,
    );

    const exportWorkouts: ExportWorkout[] = [];

    for (const workout of workouts) {
      const exercises = await this.db.query<{
        exercise_name: string;
        muscle_group: string;
        equipment: string | null;
        notes: string | null;
        order_index: number;
        sets: number;
        reps: string;
        rest_seconds: number;
        target_weight: number | null;
      }>(
        `SELECT
          e.name as exercise_name,
          e.muscle_group,
          e.equipment,
          e.notes,
          we.order_index,
          we.sets,
          we.reps,
          we.rest_seconds,
          we.target_weight
        FROM workout_exercises we
        JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.order_index ASC`,
        [workout.id],
      );

      exportWorkouts.push({
        name: workout.name,
        description: workout.description ?? undefined,
        muscle_group: (workout.muscle_group as MuscleGroup | null) ?? undefined,
        exercises: exercises.map((e) => ({
          exercise_name: e.exercise_name,
          muscle_group: e.muscle_group as MuscleGroup,
          equipment: e.equipment ?? undefined,
          notes: e.notes ?? undefined,
          order_index: e.order_index,
          sets: e.sets,
          reps: e.reps,
          rest_seconds: e.rest_seconds,
          target_weight: e.target_weight ?? undefined,
        })),
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
   * Copy JSON to clipboard
   */
  public async copyToClipboard(json: string): Promise<void> {
    await Clipboard.write({ string: json });
  }

  /**
   * Share JSON using Capacitor Share API
   */
  public async shareJson(json: string): Promise<void> {
    await Share.share({
      title: 'EzGym Workouts Export',
      text: json,
      dialogTitle: 'Share Workout Data',
    });
  }

  /**
   * Get JSON from clipboard
   */
  public async getFromClipboard(): Promise<{ value: string } | null> {
    try {
      return await Clipboard.read();
    } catch {
      return null;
    }
  }

  /**
   * Import workouts from JSON string
   */
  public async importWorkouts(json: string): Promise<ImportResult> {
    await this.db.ready();

    // Track created IDs for rollback
    const createdWorkoutIds: string[] = [];
    const createdExerciseIds: string[] = [];
    const createdWorkoutExerciseIds: string[] = [];

    try {
      const data: ExportData = JSON.parse(json);

      let exercisesCreated = 0;
      let exercisesReused = 0;

      // Import each workout
      for (const workoutData of data.workouts) {
        // Create workout
        const workoutId = uuidv4();
        const now = Date.now();

        // Get current max order_index for workouts
        const maxOrderResult = await this.db.query<{ max_order: number }>(
          'SELECT COALESCE(MAX(order_index), -1) as max_order FROM workouts',
        );
        const nextOrderIndex = (maxOrderResult[0]?.max_order ?? -1) + 1;

        await this.db.execute(
          `INSERT INTO workouts (id, name, description, muscle_group, order_index, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            workoutId,
            workoutData.name,
            workoutData.description ?? null,
            workoutData.muscle_group ?? null,
            nextOrderIndex,
            now,
            now,
          ],
        );
        createdWorkoutIds.push(workoutId);

        // Import exercises for this workout
        for (const exerciseData of workoutData.exercises) {
          // Find or create exercise
          const exerciseId = await this.findOrCreateExercise(
            exerciseData,
            createdExerciseIds,
          );

          if (createdExerciseIds.includes(exerciseId)) {
            exercisesCreated++;
          } else {
            exercisesReused++;
          }

          // Create workout_exercise entry
          const workoutExerciseId = uuidv4();
          await this.db.execute(
            `INSERT INTO workout_exercises
             (id, workout_id, exercise_id, order_index, sets, reps, rest_seconds, target_weight)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              workoutExerciseId,
              workoutId,
              exerciseId,
              exerciseData.order_index,
              exerciseData.sets,
              exerciseData.reps,
              exerciseData.rest_seconds,
              exerciseData.target_weight ?? null,
            ],
          );
          createdWorkoutExerciseIds.push(workoutExerciseId);
        }
      }

      return {
        success: true,
        workoutsImported: createdWorkoutIds.length,
        exercisesCreated,
        exercisesReused,
      };
    } catch (error) {
      // Rollback: delete all created records
      await this.rollbackImport(
        createdWorkoutIds,
        createdExerciseIds,
        createdWorkoutExerciseIds,
      );
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

      // Get existing exercise names
      const existingExercises = await this.getExistingExerciseNames();
      const newExercisesSet = new Set<string>();
      const existingExercisesSet = new Set<string>();
      const warnings: import('@core').ValidationWarning[] = [];

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

  /**
   * Find existing exercise by name or create new one
   * Returns exercise ID and adds to createdExerciseIds if new
   */
  private async findOrCreateExercise(
    exerciseData: ExportExercise,
    createdExerciseIds: string[],
  ): Promise<string> {
    // Try to find existing exercise by name (case-insensitive)
    const existing = await this.db.query<Exercise>(
      'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?)',
      [exerciseData.exercise_name],
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new exercise
    const id = uuidv4();
    const now = Date.now();

    await this.db.execute(
      'INSERT INTO exercises (id, name, muscle_group, equipment, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        exerciseData.exercise_name,
        exerciseData.muscle_group,
        exerciseData.equipment ?? null,
        exerciseData.notes ?? null,
        now,
        now,
      ],
    );

    createdExerciseIds.push(id);
    return id;
  }

  /**
   * Get all existing exercise names (lowercase)
   */
  private async getExistingExerciseNames(): Promise<Set<string>> {
    const exercises = await this.db.query<{ name: string }>(
      'SELECT LOWER(name) as name FROM exercises',
    );
    return new Set(exercises.map((e) => e.name));
  }

  /**
   * Rollback import by deleting created records
   */
  private async rollbackImport(
    workoutIds: string[],
    exerciseIds: string[],
    workoutExerciseIds: string[],
  ): Promise<void> {
    try {
      // Delete workout_exercises first (foreign keys)
      for (const id of workoutExerciseIds) {
        await this.db.execute('DELETE FROM workout_exercises WHERE id = ?', [
          id,
        ]);
      }

      // Delete workouts
      for (const id of workoutIds) {
        await this.db.execute('DELETE FROM workouts WHERE id = ?', [id]);
      }

      // Delete exercises
      for (const id of exerciseIds) {
        await this.db.execute('DELETE FROM exercises WHERE id = ?', [id]);
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }
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
