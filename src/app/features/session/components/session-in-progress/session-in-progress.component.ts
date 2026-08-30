import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  SetLog,
  WorkoutExercise,
  WorkoutSession,
} from '@core/models/app-models';
import {
  AlertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRange,
  IonRow,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  createOutline,
  informationCircleOutline,
  trashOutline,
} from 'ionicons/icons';

/** Default RPE for a new set, kept consistent between field and resetForm. */
const DEFAULT_RPE = 7;

@Component({
  selector: 'app-session-in-progress',
  imports: [
    FormsModule,
    TranslatePipe,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonRange,
    IonListHeader,
    MuscleIconComponent,
  ],
  templateUrl: './session-in-progress.component.html',
  styleUrl: './session-in-progress.component.scss',
})
export class SessionInProgressComponent {
  public readonly exercises = input.required<WorkoutExercise[]>();
  public readonly setLogs = input.required<SetLog[]>();
  public readonly session = input.required<WorkoutSession>();

  logSet = output<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
  }>();

  deleteSet = output<string>();
  finishSession = output<void>();
  updateSet = output<SetLog>();

  // Injections
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  // View references
  private readonly exerciseItems =
    viewChildren<ElementRef<HTMLButtonElement>>('exerciseItem');

  // Local state
  public readonly currentExerciseIndex = signal(0);
  public readonly editingSetId = signal<string | null>(null);

  // Form state
  public reps: number | null = null;
  public weight: number | null = null;
  public rpe: number = DEFAULT_RPE;

  /**
   * Guarded against out-of-bounds indexes (e.g. exercises removed during
   * the session): yields undefined instead of crashing the template.
   */
  public readonly currentExercise = computed<WorkoutExercise | undefined>(() => {
    const exercises = this.exercises();
    const index = this.currentExerciseIndex();
    return index >= 0 && index < exercises.length
      ? exercises[index]
      : undefined;
  });

  public readonly currentLogs = computed(() => {
    const exercise = this.currentExercise();
    if (!exercise) return [];

    return this.setLogs()
      .filter((l) => l.exercise_id === exercise.exercise_id)
      .sort((a, b) => a.set_number - b.set_number);
  });

  public readonly nextSetNumber = computed(() => {
    return this.currentLogs().length;
  });

  public readonly exerciseStates = computed(() => {
    return this.exercises().map((exercise, index) => ({
      exercise,
      index,
      isComplete: this.isExerciseComplete(index),
      isActive: this.currentExerciseIndex() === index,
    }));
  });

  protected readonly allExercisesComplete = computed(() => {
    return this.exercises().every((_, index) => this.isExerciseComplete(index));
  });

  constructor() {
    addIcons({
      checkmarkCircle,
      trashOutline,
      createOutline,
      informationCircleOutline,
    });

    effect(() => {
      const exercises = this.exercises();
      if (exercises.length > 0) {
        this.resetForm();
      }
      this.exerciseItems();
      this.scrollToActiveExercise();
    });
  }

  resetForm() {
    this.editingSetId.set(null);
    const ex = this.currentExercise();
    if (!ex) return;

    const targetReps = parseInt(ex.reps) || 12;

    this.reps = targetReps;
    this.weight = ex.target_weight ?? 0;
    this.rpe = DEFAULT_RPE;
  }

  editSet(log: SetLog) {
    this.editingSetId.set(log.id);
    this.reps = log.reps;
    this.weight = log.weight;
    this.rpe = log.rpe ?? 0;
  }

  cancelEdit() {
    this.resetForm();
  }

  onLogSet() {
    const exercise = this.currentExercise();
    if (!exercise || this.reps === null || this.weight === null) return;

    if (this.editingSetId()) {
      const log = this.setLogs().find((l) => l.id === this.editingSetId());
      if (log) {
        this.updateSet.emit({
          ...log,
          reps: this.reps,
          weight: this.weight,
          rpe: this.rpe,
        });
      }
      this.resetForm();
    } else {
      this.logSet.emit({
        exerciseId: exercise.exercise_id,
        setNumber: this.nextSetNumber(),
        reps: this.reps,
        weight: this.weight,
        rpe: this.rpe,
      });
      this.checkAndAdvanceToNextExercise(true);
    }
  }

  public selectExercise(index: number): void {
    if (index >= 0 && index < this.exercises().length) {
      this.currentExerciseIndex.set(index);
      this.resetForm();
    }
  }

  public async showRPEInfo(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('SESSION.IN_PROGRESS.RPE_INFO_TITLE'),
      message: this.translate
        .instant('SESSION.IN_PROGRESS.RPE_INFO_MESSAGE')
        .replace(/\|n/g, '\n'),
      cssClass: 'rpe-info-alert',
      buttons: [
        {
          text: this.translate.instant('SESSION.IN_PROGRESS.RPE_INFO_CLOSE'),
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  private isExerciseComplete(exerciseIndex: number): boolean {
    const exercise = this.exercises()[exerciseIndex];
    if (!exercise) return false;

    const exerciseLogs = this.setLogs().filter(
      (log) => log.exercise_id === exercise.exercise_id,
    );
    return exerciseLogs.length >= exercise.sets;
  }

  private checkAndAdvanceToNextExercise(newSetAdded: boolean = false): void {
    const currentIndex = this.currentExerciseIndex();
    const currentExercise = this.exercises()[currentIndex];
    if (!currentExercise) return;

    const exerciseLogs = this.setLogs().filter(
      (log) => log.exercise_id === currentExercise.exercise_id,
    );
    const expectedLogCount = newSetAdded
      ? exerciseLogs.length + 1
      : exerciseLogs.length;

    if (expectedLogCount < currentExercise.sets) {
      return;
    }

    for (let i = currentIndex + 1; i < this.exercises().length; i++) {
      if (!this.isExerciseComplete(i)) {
        this.currentExerciseIndex.set(i);
        this.resetForm();
        return;
      }
    }
  }

  private scrollToActiveExercise(): void {
    requestAnimationFrame(() => {
      const activeItem = this.exerciseItems()[this.currentExerciseIndex()];
      if (activeItem) {
        activeItem.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    });
  }
}
