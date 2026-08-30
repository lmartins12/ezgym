import {
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  createOutline,
  informationCircleOutline,
  trashOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-session-in-progress',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
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
  styleUrls: ['./session-in-progress.component.scss'],
})
export class SessionInProgressComponent {
  public readonly exercises = input.required<WorkoutExercise[]>();
  public readonly setLogs = input.required<SetLog[]>();
  public readonly session = input.required<WorkoutSession>();

  @Output() logSet = new EventEmitter<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
  }>();

  @Output() deleteSet = new EventEmitter<string>();
  @Output() finishSession = new EventEmitter<void>();
  @Output() updateSet = new EventEmitter<SetLog>();

  // Injections
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  // Local state
  public readonly currentExerciseIndex = signal(0);
  public readonly editingSetId = signal<string | null>(null);

  // Form state
  public reps: number | null = null;
  public weight: number | null = null;
  public rpe = 5; // Default RPE

  public readonly currentExercise = computed(() => {
    return this.exercises()[this.currentExerciseIndex()];
  });

  public readonly currentLogs = computed(() => {
    const exId = this.currentExercise().exercise_id;
    return this.setLogs()
      .filter((l) => l.exercise_id === exId)
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
      this.scrollToActiveExercise();
    });
  }

  resetForm() {
    this.editingSetId.set(null);
    const ex = this.currentExercise();
    const targetReps = parseInt(ex.reps) || 12;

    this.reps = targetReps;
    this.weight = ex.target_weight ?? 0;
    this.rpe = 7;
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
    if (this.reps === null || this.weight === null) return;

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
        exerciseId: this.currentExercise().exercise_id,
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
    const exerciseLogs = this.setLogs().filter(
      (log) => log.exercise_id === exercise.exercise_id,
    );
    return exerciseLogs.length >= exercise.sets;
  }

  private checkAndAdvanceToNextExercise(newSetAdded: boolean = false): void {
    const currentIndex = this.currentExerciseIndex();
    const currentExercise = this.exercises()[currentIndex];

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
      const activeElement = document.querySelector('.exercise-item.active');
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    });
  }
}
