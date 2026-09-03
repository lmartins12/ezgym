import { Component, inject, input, signal } from '@angular/core';
import type { Workout } from '@domain/workouts/workout';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import { BackButtonService } from '@core/back-button/back-button';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonLabel,
  IonList,
  IonListHeader,
  IonReorderGroup,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  NavController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  barbellOutline,
  createOutline,
  fitnessOutline,
  playOutline,
  reorderTwoOutline,
} from 'ionicons/icons';
import {
  EXERCISE_DEFAULTS,
  type ExerciseData,
} from '../components/exercise-editor-modal/exercise-editor-modal.component';
import { ExerciseEditorModalComponent } from '../components/exercise-editor-modal/exercise-editor-modal.component';
import { ExercisePickerModalComponent } from '../components/exercise-picker-modal/exercise-picker-modal.component';
import { ExerciseListItemComponent } from '../components/exercise-list-item/exercise-list-item.component';
import type { WorkoutFormResult } from '../components/workout-form-modal/workout-form-modal.component';
import { WorkoutFormModalComponent } from '../components/workout-form-modal/workout-form-modal.component';
import { WorkoutsFacade } from '../facades/workouts.facade';
import {
  equipmentKindLabelKey,
  type ExercisePickerOption,
} from '../models/exercise-picker.models';

@Component({
  selector: 'app-workout-detail',
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonCard,
    IonCardContent,
    IonList,
    IonListHeader,
    IonLabel,
    IonReorderGroup,
    IonSpinner,
    ExerciseListItemComponent,
    IonIcon,
  ],
  templateUrl: './workout-detail.page.html',
  styleUrl: './workout-detail.page.scss',
})
export class WorkoutDetailPage {
  public readonly id = input.required<string>();
  private readonly translate = inject(TranslateService);
  private readonly navCtrl = inject(NavController);
  private readonly workoutsFacade = inject(WorkoutsFacade);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly backButton = inject(BackButtonService);

  public readonly workout = signal<Workout | null>(null);
  public readonly exercises = signal<WorkoutExercise[]>([]);
  public readonly loading = signal(false);

  constructor() {
    addIcons({
      playOutline,
      createOutline,
      fitnessOutline,
      barbellOutline,
      arrowBackOutline,
      reorderTwoOutline,
    });
  }

  public async ionViewWillEnter(): Promise<void> {
    const id = this.id();
    if (!id) {
      this.navigateWorkouts();
      return;
    }

    await Promise.all([this.loadWorkout(), this.loadExercises()]);
  }

  public navigateWorkouts(): void {
    this.navCtrl.navigateBack('/tabs/workouts');
  }

  /**
   * Mirrors the workouts-list slider: start = navigate to the session
   * route; SessionPage owns initializing/creating the session.
   */
  public startWorkout(): void {
    const id = this.id();
    if (!id || this.exercises().length === 0) return;

    this.navCtrl.navigateForward(['/session', id]);
  }

  private async loadWorkout(): Promise<void> {
    const id = this.id();
    if (!id) return;

    const data = await this.workoutsFacade.getById(id);
    if (!data) {
      this.navigateWorkouts();
      return;
    }

    this.workout.set(data);
  }

  private async loadExercises(): Promise<void> {
    const id = this.id();
    if (!id) return;

    this.loading.set(true);
    try {
      const data = await this.workoutsFacade.getExercises(id);
      this.exercises.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  public async openEditWorkout(): Promise<void> {
    const workout = this.workout();
    if (!workout) return;

    const modal = await this.modalCtrl.create({
      component: WorkoutFormModalComponent,
      componentProps: { workout },
    });

    await modal.present();
    void this.backButton.track(modal);

    const { data } = await modal.onWillDismiss<WorkoutFormResult>();

    if (data) {
      await this.workoutsFacade.update(
        workout.id,
        data.name,
        data.description,
        data.muscle_group,
      );
      await this.loadWorkout();
    }
  }

  public async openAddExercise(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExercisePickerModalComponent,
    });

    await modal.present();
    void this.backButton.track(modal);

    const { data, role } = await modal.onWillDismiss<
      ExercisePickerOption[] | string | null
    >();

    if (role === 'confirm' && Array.isArray(data)) {
      await this.addPickedExercises(data);
      return;
    }

    if (role === 'create') {
      await this.openExerciseEditor(
        typeof data === 'string' ? data : undefined,
      );
    }
  }

  private async addPickedExercises(
    options: ExercisePickerOption[],
  ): Promise<void> {
    const workoutId = this.id();
    if (!workoutId || options.length === 0) return;

    await this.workoutsFacade.addExercises(
      options.map((option) => ({
        workoutId,
        name: option.name,
        muscleGroup: option.muscle_group,
        equipment: this.equipmentFor(option),
        notes: option.notes,
        sets: EXERCISE_DEFAULTS.sets,
        reps: EXERCISE_DEFAULTS.reps,
        restSeconds: EXERCISE_DEFAULTS.restSeconds,
      })),
    );
    await this.loadExercises();
  }

  /**
   * Manual escape hatch: the full editor, optionally pre-filled with a
   * search term (picker's "create '<term>'" CTA).
   */
  private async openExerciseEditor(initialName?: string): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExerciseEditorModalComponent,
      componentProps: initialName ? { initialName } : undefined,
    });

    await modal.present();
    void this.backButton.track(modal);

    const { data } = await modal.onWillDismiss<ExerciseData>();

    if (data) {
      await this.workoutsFacade.addExercise({
        workoutId: this.id(),
        name: data.name,
        muscleGroup: data.muscleGroup,
        equipment: data.equipment,
        notes: data.notes,
        sets: data.sets,
        reps: data.reps,
        targetWeight: data.targetWeight,
        restSeconds: data.restSeconds,
      });
      await this.loadExercises();
    }
  }

  private equipmentFor(option: ExercisePickerOption): string | undefined {
    if (option.equipment_kind) {
      return this.translate.instant(
        equipmentKindLabelKey(option.equipment_kind),
      );
    }
    return option.equipment || undefined;
  }

  public async openEditExercise(exercise: WorkoutExercise): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExerciseEditorModalComponent,
      componentProps: { exercise },
    });

    await modal.present();
    void this.backButton.track(modal);

    const { data } = await modal.onWillDismiss<ExerciseData>();

    if (data) {
      await this.workoutsFacade.updateExercise(exercise.id, {
        name: data.name,
        muscleGroup: data.muscleGroup,
        equipment: data.equipment,
        notes: data.notes,
        sets: data.sets,
        reps: data.reps,
        targetWeight: data.targetWeight,
        restSeconds: data.restSeconds,
      });
      await this.loadExercises();
    }
  }

  public async confirmDeleteExercise(exerciseId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('WORKOUT_DETAIL.DELETE_EXERCISE_CONFIRM'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.workoutsFacade.removeExercise(exerciseId);
            await this.loadExercises();
          },
        },
      ],
    });

    await alert.present();
    void this.backButton.track(alert);
  }

  public async reorderExercises(event: CustomEvent): Promise<void> {
    const exerciseIds = event.detail.complete(
      this.exercises().map((e) => e.id),
    );
    await this.workoutsFacade.reorderExercises(exerciseIds);
    await this.loadExercises();
  }
}
