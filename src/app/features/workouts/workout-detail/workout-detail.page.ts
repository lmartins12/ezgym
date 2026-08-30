import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type {
  MuscleGroup,
  Workout,
  WorkoutExercise,
} from '@core/models/app-models';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
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
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  barbellOutline,
  createOutline,
  fitnessOutline,
  playOutline,
} from 'ionicons/icons';
import type { ExerciseData } from '../components/exercise-editor-modal/exercise-editor-modal.component';
import { ExerciseEditorModalComponent } from '../components/exercise-editor-modal/exercise-editor-modal.component';
import { ExerciseListItemComponent } from '../components/exercise-list-item/exercise-list-item.component';
import type { WorkoutFormResult } from '../components/workout-form-modal/workout-form-modal.component';
import { WorkoutFormModalComponent } from '../components/workout-form-modal/workout-form-modal.component';
import { WorkoutExercisesService } from '../services/workout-exercises.service';
import { WorkoutsService } from '../services/workouts.service';

@Component({
  selector: 'app-workout-detail',
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
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
  styleUrls: ['./workout-detail.page.scss'],
})
export class WorkoutDetailPage {
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly navCtrl = inject(NavController);
  private readonly workoutsService = inject(WorkoutsService);
  private readonly exercisesService = inject(WorkoutExercisesService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);

  public readonly workoutId = signal<string>('');
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
    });
  }

  public async ionViewWillEnter(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.navigateWorkouts();
      return;
    }

    this.workoutId.set(id);
    await Promise.all([this.loadWorkout(), this.loadExercises()]);
  }

  public navigateWorkouts(): void {
    this.navCtrl.navigateBack('/tabs/workouts');
  }

  private async loadWorkout(): Promise<void> {
    const id = this.workoutId();
    if (!id) return;

    const data = await this.workoutsService.getById(id);
    if (!data) {
      this.navigateWorkouts();
      return;
    }

    this.workout.set(data);
  }

  private async loadExercises(): Promise<void> {
    const id = this.workoutId();
    if (!id) return;

    this.loading.set(true);
    try {
      const data = await this.exercisesService.getByWorkoutId(id);
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

    const { data } = await modal.onWillDismiss<WorkoutFormResult>();

    if (data) {
      await this.workoutsService.update(
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
      component: ExerciseEditorModalComponent,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<ExerciseData>();

    if (data) {
      await this.exercisesService.addExercise({
        workoutId: this.workoutId(),
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

  public async openEditExercise(exercise: WorkoutExercise): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExerciseEditorModalComponent,
      componentProps: { exercise },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<ExerciseData>();

    if (data) {
      await this.exercisesService.updateExercise(exercise.id, {
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
            await this.exercisesService.removeExercise(exerciseId);
            await this.loadExercises();
          },
        },
      ],
    });

    await alert.present();
  }

  public async reorderExercises(event: CustomEvent): Promise<void> {
    const exerciseIds = event.detail.complete(
      this.exercises().map((e) => e.id),
    );
    await this.exercisesService.reorderExercises(this.workoutId(), exerciseIds);
    await this.loadExercises();
  }
}
