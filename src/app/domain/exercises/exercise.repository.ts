import { inject, Injectable } from '@angular/core';
import { db } from '@core/db/app-db';
import { DatabaseService } from '@core/db/database';
import { v4 as uuidv4 } from 'uuid';
import { normalizeText } from '../shared/normalize-text';
import type { Exercise } from './exercise';

export interface ExerciseSeedData {
  name: string;
  muscleGroup?: Exercise['muscle_group'];
  equipment?: string;
  notes?: string;
}

export interface FindOrCreateOptions {
  /**
   * When true, the stored exercise metadata (muscle group, equipment,
   * notes) is replaced by the provided data. Used by the manual "add
   * exercise" flow. Import flows keep existing metadata.
   */
  overwriteMetadata?: boolean;
  /**
   * Optional preloaded map of normalized exercise name -> Exercise.
   * When provided, lookups are O(1) and newly created exercises are
   * added to the map, keeping it consistent across a batch import.
   */
  knownExercises?: Map<string, Exercise>;
}

/**
 * Persistence for the Exercise aggregate (the exercise catalog).
 */
@Injectable({ providedIn: 'root' })
export class ExerciseRepository {
  private readonly database = inject(DatabaseService);

  public async getById(id: string): Promise<Exercise | null> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    return (await db.exercises.get(id)) ?? null;
  }

  public async getByIds(ids: string[]): Promise<Exercise[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    if (ids.length === 0) return [];
    return db.exercises.where('id').anyOf(ids).toArray();
  }

  /**
   * Every catalog exercise (unordered read for pickers and merges).
   */
  public async listAll(): Promise<Exercise[]> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    return db.exercises.toArray();
  }

  /**
   * Map of normalized (trimmed, lowercased, accent-free) exercise
   * name -> Exercise.
   */
  public async getNameMap(): Promise<Map<string, Exercise>> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const exercises = await db.exercises.toArray();
    return new Map(exercises.map((e) => [normalizeText(e.name), e]));
  }

  /**
   * Set of normalized (trimmed, lowercased, accent-free) exercise names.
   */
  public async getExistingNames(): Promise<Set<string>> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const names = await db.exercises.orderBy('name').keys();
    return new Set(
      names
        .filter((name): name is string => typeof name === 'string')
        .map((name) => normalizeText(name)),
    );
  }

  /**
   * Find an exercise by (case-insensitive) name or create it.
   */
  public async findOrCreate(
    data: ExerciseSeedData,
    options: FindOrCreateOptions = {},
  ): Promise<{ exerciseId: string; isNew: boolean }> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    const normalizedName = normalizeText(data.name);

    let existing: Exercise | undefined;
    if (options.knownExercises) {
      existing = options.knownExercises.get(normalizedName);
    } else {
      const all = await db.exercises.toArray();
      existing = all.find((e) => normalizeText(e.name) === normalizedName);
    }

    const now = Date.now();

    if (existing) {
      if (options.overwriteMetadata) {
        await db.exercises.update(existing.id, {
          muscle_group: data.muscleGroup,
          equipment: data.equipment || undefined,
          notes: data.notes || undefined,
          updated_at: now,
        });
      }
      return { exerciseId: existing.id, isNew: false };
    }

    const id = uuidv4();
    const newExercise: Exercise = {
      id,
      name: data.name.trim(),
      muscle_group: data.muscleGroup ?? 'other',
      equipment: data.equipment || undefined,
      notes: data.notes || undefined,
      created_at: now,
      updated_at: now,
    };

    await db.exercises.add(newExercise);
    options.knownExercises?.set(normalizedName, newExercise);

    return { exerciseId: id, isNew: true };
  }

  /**
   * Updates the canonical catalog entry. Manual edits share metadata
   * across every workout referencing the exercise.
   */
  public async update(id: string, changes: Partial<Exercise>): Promise<void> {
    if (!this.database.inWriteTransaction) {
      await this.database.initialize();
    }
    await db.exercises.update(id, changes);
  }
}
