import { Component, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import {
  EQUIPMENT_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  REPS_MAX_LENGTH,
  REST_SECONDS_RANGE,
  SETS_RANGE,
  WEIGHT_RANGE,
  clampToRange,
  isValidRepsFormat,
} from '@domain/shared/limits';
import type { NumericRange } from '@domain/shared/limits';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItemDivider,
  IonLabel,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleGroupSelectorComponent } from '@shared/components/muscle-group-selector/muscle-group-selector.component';
import { NumberClampDirective } from '@shared/directives/number-clamp.directive';
import { TextLimitDirective } from '@shared/directives/text-limit.directive';

export interface ExerciseData {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  notes?: string;
  sets: number;
  reps: string;
  targetWeight?: number;
  restSeconds: number;
}

/**
 * Prescription defaults for a freshly added exercise. Single source of
 * truth for both the editor form and the picker's quick-add flow.
 */
export const EXERCISE_DEFAULTS = {
  sets: 3,
  reps: '12',
  restSeconds: 60,
} as const;

@Component({
  selector: 'app-exercise-editor-modal',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
    IonLabel,
    IonInput,
    IonTextarea,
    IonItemDivider,
    IonFooter,
    TranslatePipe,
    MuscleGroupSelectorComponent,
    NumberClampDirective,
    TextLimitDirective,
  ],
  templateUrl: './exercise-editor-modal.component.html',
  styleUrl: './exercise-editor-modal.component.scss',
})
export class ExerciseEditorModalComponent {
  public readonly exercise = input<WorkoutExercise | undefined>(undefined);

  /** Pre-filled name when opened from the picker's "create term" CTA. */
  public readonly initialName = input<string | undefined>(undefined);

  public readonly name = model('');
  public readonly muscleGroup = model<MuscleGroup>('upper');
  public readonly equipment = model('');
  public readonly notes = model('');
  public readonly sets = model<number>(EXERCISE_DEFAULTS.sets);
  public readonly reps = model<string>(EXERCISE_DEFAULTS.reps);
  public readonly targetWeight = model<number | undefined>(undefined);
  public readonly restSeconds = model<number>(EXERCISE_DEFAULTS.restSeconds);

  public readonly repsInvalid = signal(false);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly equipmentMaxLength = EQUIPMENT_MAX_LENGTH;
  protected readonly notesMaxLength = NOTES_MAX_LENGTH;
  protected readonly repsMaxLength = REPS_MAX_LENGTH;
  protected readonly setsMax = SETS_RANGE.max;
  protected readonly weightMax = WEIGHT_RANGE.max;
  protected readonly restMax = REST_SECONDS_RANGE.max;
  protected readonly setsRange: NumericRange = SETS_RANGE;
  protected readonly weightRange: NumericRange = WEIGHT_RANGE;
  protected readonly restRange: NumericRange = REST_SECONDS_RANGE;

  private readonly modalCtrl = inject(ModalController);

  public ionViewDidEnter(): void {
    const exercise = this.exercise();
    if (exercise) {
      this.name.set(exercise.exercise_name ?? '');
      this.muscleGroup.set(exercise.muscle_group ?? 'upper');
      this.equipment.set(exercise.equipment ?? '');
      this.notes.set(exercise.notes ?? '');
      this.sets.set(exercise.sets);
      this.reps.set(exercise.reps);
      this.targetWeight.set(exercise.target_weight);
      this.restSeconds.set(exercise.rest_seconds);
      return;
    }

    const initialName = this.initialName();
    if (initialName) {
      this.name.set(initialName);
    }
  }

  public close(): void {
    void this.modalCtrl.dismiss();
  }

  public onSetsChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) return;
    this.sets.set(clampToRange(Number(value), SETS_RANGE));
  }

  public onWeightChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) {
      this.targetWeight.set(undefined);
      return;
    }
    this.targetWeight.set(clampToRange(Number(value), WEIGHT_RANGE));
  }

  public onRestChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) return;
    this.restSeconds.set(clampToRange(Number(value), REST_SECONDS_RANGE));
  }

  public submit(): void {
    const name = this.name().trim();
    if (!name) {
      return;
    }

    const reps = this.reps().trim();
    if (!isValidRepsFormat(reps)) {
      this.repsInvalid.set(true);
      return;
    }

    const rawTargetWeight = this.targetWeight();

    const data: ExerciseData = {
      name,
      muscleGroup: this.muscleGroup(),
      equipment: this.equipment().trim() || undefined,
      notes: this.notes().trim() || undefined,
      sets: clampToRange(Number(this.sets()), SETS_RANGE),
      reps,
      targetWeight:
        rawTargetWeight === undefined || rawTargetWeight === null
          ? undefined
          : clampToRange(Number(rawTargetWeight), WEIGHT_RANGE),
      restSeconds: clampToRange(Number(this.restSeconds()), REST_SECONDS_RANGE),
    };

    void this.modalCtrl.dismiss(data);
  }
}
