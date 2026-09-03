import {
  afterRenderEffect,
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
import type { SetLog } from '@domain/sessions/set-log';
import type { WorkoutSession } from '@domain/sessions/workout-session';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import {
  LOG_REPS_RANGE,
  WEIGHT_RANGE,
  clampToRange,
} from '@domain/shared/limits';
import type { NumericRange } from '@domain/shared/limits';
import { BackButtonService } from '@core/back-button/back-button';
import { HapticsService } from '@core/haptics/haptics';
import {
  AlertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonLabel,
  IonRange,
  IonRow,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { NumberClampDirective } from '@shared/directives/number-clamp.directive';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  checkmarkCircle,
  informationCircleOutline,
} from 'ionicons/icons';
import { ExerciseDetailsModalComponent } from '../exercise-details-modal/exercise-details-modal.component';
import { SessionLogsListComponent } from '../session-logs-list/session-logs-list.component';
import { SessionRestCardComponent } from '../session-rest-card/session-rest-card.component';
import { RestTimerService } from '../../services/rest-timer';

/** Default RPE for a new set, kept consistent between field and resetForm. */
const DEFAULT_RPE = 7;

@Component({
  selector: 'app-session-in-progress',
  providers: [RestTimerService],
  imports: [
    FormsModule,
    TranslatePipe,
    IonCard,
    IonCardContent,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonRange,
    MuscleIconComponent,
    NumberClampDirective,
    SessionLogsListComponent,
    SessionRestCardComponent,
  ],
  templateUrl: './session-in-progress.component.html',
  styleUrl: './session-in-progress.component.scss',
})
export class SessionInProgressComponent {
  public readonly exercises = input.required<WorkoutExercise[]>();
  public readonly setLogs = input.required<SetLog[]>();
  public readonly session = input.required<WorkoutSession>();

  public readonly logSet = output<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
  }>();

  public readonly deleteSet = output<string>();
  public readonly finishSession = output<void>();
  public readonly updateSet = output<SetLog>();

  // Injections
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly backButton = inject(BackButtonService);
  private readonly haptics = inject(HapticsService);
  private readonly modalCtrl = inject(ModalController);
  public readonly restTimer = inject(RestTimerService);

  // View references
  private readonly exerciseItems =
    viewChildren<ElementRef<HTMLButtonElement>>('exerciseItem');

  // Local state
  public readonly currentExerciseIndex = signal(0);
  public readonly editingSetId = signal<string | null>(null);

  /** Rest flow: index where the rest started and where to focus when it ends. */
  private restStartIndex: number | null = null;
  private pendingAdvanceIndex: number | null = null;

  // Form state
  public reps: number | null = null;
  public weight: number | null = null;
  public rpe: number = DEFAULT_RPE;

  protected readonly logRepsMax = LOG_REPS_RANGE.max;
  protected readonly weightMax = WEIGHT_RANGE.max;
  protected readonly logRepsRange: NumericRange = LOG_REPS_RANGE;
  protected readonly weightRange: NumericRange = WEIGHT_RANGE;

  /**
   * Guarded against out-of-bounds indexes (e.g. exercises removed during
   * the session): yields undefined instead of crashing the template.
   */
  public readonly currentExercise = computed<WorkoutExercise | undefined>(
    () => {
      const exercises = this.exercises();
      const index = this.currentExerciseIndex();
      return index >= 0 && index < exercises.length
        ? exercises[index]
        : undefined;
    },
  );

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
      barbellOutline,
      checkmarkCircle,
      informationCircleOutline,
    });

    effect(
      () => {
        if (this.exercises().length > 0) {
          this.resetForm();
        }
      },
      { allowSignalWrites: true },
    );

    afterRenderEffect(() => {
      this.exerciseItems();
      this.currentExerciseIndex();
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

  onRepsChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) {
      this.reps = null;
      return;
    }
    this.reps = clampToRange(Number(value), LOG_REPS_RANGE);
  }

  onWeightChange(value: number | string | null): void {
    if (value === '' || value === null || value === undefined) {
      this.weight = null;
      return;
    }
    this.weight = clampToRange(Number(value), WEIGHT_RANGE);
  }

  cancelEdit() {
    this.resetForm();
  }

  onLogSet() {
    const exercise = this.currentExercise();
    if (!exercise || this.reps === null || this.weight === null) return;

    const reps = clampToRange(Number(this.reps), LOG_REPS_RANGE);
    const weight = clampToRange(Number(this.weight), WEIGHT_RANGE);

    if (this.editingSetId()) {
      const log = this.setLogs().find((l) => l.id === this.editingSetId());
      if (log) {
        this.updateSet.emit({
          ...log,
          reps,
          weight,
          rpe: this.rpe,
        });
      }
      this.resetForm();
    } else {
      this.logSet.emit({
        exerciseId: exercise.exercise_id,
        setNumber: this.nextSetNumber(),
        reps,
        weight,
        rpe: this.rpe,
      });
      this.handlePostLogFlow();
    }
  }

  public selectExercise(index: number): void {
    if (index >= 0 && index < this.exercises().length) {
      this.currentExerciseIndex.set(index);
      this.resetForm();
    }
  }

  /** Opens the readonly details (target, equipment, notes) of the current exercise. */
  public async openExerciseDetails(): Promise<void> {
    const exercise = this.currentExercise();
    if (!exercise) return;

    const modal = await this.modalCtrl.create({
      component: ExerciseDetailsModalComponent,
      componentProps: { exercise },
      cssClass: 'exercise-details-modal',
    });

    await modal.present();
    void this.backButton.track(modal);
  }

  onSkipRest(): void {
    this.restTimer.skip();
    this.applyRestAdvance();
  }

  onAddRestTime(): void {
    this.restTimer.addSeconds(30);
  }

  /**
   * Decides what follows a newly logged set: rest countdown, immediate
   * advance, or finish — reading the logs as they were BEFORE this set
   * (the store patch is async).
   */
  private handlePostLogFlow(): void {
    const exercise = this.currentExercise();
    if (!exercise) return;

    const currentIndex = this.currentExerciseIndex();
    const willCompleteExercise = this.currentLogs().length + 1 >= exercise.sets;
    const nextIndex = willCompleteExercise
      ? this.findNextIncompleteExerciseIndex(currentIndex)
      : currentIndex;
    const hasMoreWork = willCompleteExercise ? nextIndex !== null : true;

    if (!hasMoreWork) {
      this.finishSession.emit();
      return;
    }

    const restSeconds = exercise.rest_seconds ?? 0;
    if (restSeconds <= 0) {
      this.checkAndAdvanceToNextExercise(true);
      return;
    }

    this.restStartIndex = currentIndex;
    this.pendingAdvanceIndex = nextIndex;
    this.restTimer.start(restSeconds, () => this.onRestCountdownEnd());
  }

  private onRestCountdownEnd(): void {
    this.haptics.doubleTap();
    this.applyRestAdvance();
  }

  /** Focuses the next set, unless the user navigated away during the rest. */
  private applyRestAdvance(): void {
    const startIndex = this.restStartIndex;
    const targetIndex = this.pendingAdvanceIndex;
    if (startIndex === null || targetIndex === null) return;

    this.restStartIndex = null;
    this.pendingAdvanceIndex = null;
    if (this.currentExerciseIndex() !== startIndex) return;
    if (targetIndex !== startIndex) {
      this.selectExercise(targetIndex);
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
    void this.backButton.track(alert);
  }

  private isExerciseComplete(exerciseIndex: number): boolean {
    const exercise = this.exercises()[exerciseIndex];
    if (!exercise) return false;

    const exerciseLogs = this.setLogs().filter(
      (log) => log.exercise_id === exercise.exercise_id,
    );
    return exerciseLogs.length >= exercise.sets;
  }

  private findNextIncompleteExerciseIndex(fromIndex: number): number | null {
    for (let i = fromIndex + 1; i < this.exercises().length; i++) {
      if (!this.isExerciseComplete(i)) {
        return i;
      }
    }
    return null;
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

    const nextIndex = this.findNextIncompleteExerciseIndex(currentIndex);
    if (nextIndex !== null) {
      this.currentExerciseIndex.set(nextIndex);
      this.resetForm();
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
