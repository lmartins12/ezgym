import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackButtonService } from '@core/back-button/back-button';
import {
  AlertController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList,
  IonReorderGroup,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { add, barbellOutline, reorderTwoOutline } from 'ionicons/icons';
import { WorkoutCardComponent } from '../components/workout-card/workout-card.component';
import {
  WorkoutFormModalComponent,
  type WorkoutFormResult,
} from '../components/workout-form-modal/workout-form-modal.component';
import type { WorkoutDetail } from '../models/workout-detail.models';
import { WorkoutsFacade } from '../facades/workouts.facade';
import { WorkoutsQuery } from '../queries/workouts.query';

@Component({
  selector: 'app-workouts-list',
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonList,
    IonReorderGroup,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    WorkoutCardComponent,
  ],
  templateUrl: './workouts-list.page.html',
  styleUrl: './workouts-list.page.scss',
})
export class WorkoutsListPage {
  private readonly workoutsFacade = inject(WorkoutsFacade);
  private readonly workoutsQuery = inject(WorkoutsQuery);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly modalCtrl = inject(ModalController);
  private readonly backButton = inject(BackButtonService);

  public readonly workouts = signal<WorkoutDetail[]>([]);
  public readonly loading = signal(false);

  constructor() {
    addIcons({
      add,
      barbellOutline,
      reorderTwoOutline,
    });
  }

  public ionViewWillEnter(): void {
    this.loadWorkouts();
  }

  public async loadWorkouts(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.workoutsQuery.list();
      this.workouts.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  public async openCreateModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: WorkoutFormModalComponent,
      componentProps: { workout: undefined },
    });

    await modal.present();
    void this.backButton.track(modal);

    const { data } = await modal.onWillDismiss<WorkoutFormResult>();

    if (data) {
      const id = await this.workoutsFacade.create(
        data.name,
        data.description,
        data.muscle_group,
      );
      this.router.navigate(['/workouts', id]);
    }
  }

  public async confirmDelete(workoutId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.workouts().find((w) => w.id === workoutId)?.name,
      message: `${this.translate.instant('WORKOUTS.DELETE_CONFIRM')}\n\n${this.translate.instant('WORKOUTS.DELETE_ALL_EXERCISES')}`,
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: async () => {
            await this.workoutsFacade.delete(workoutId);
            await this.loadWorkouts();
          },
        },
      ],
    });

    await alert.present();
    void this.backButton.track(alert);
  }

  public startWorkout(workout: WorkoutDetail): void {
    if (!workout.id || workout.exercise_count === 0) return;

    this.router.navigate(['/session', workout.id]);
  }

  public reorderWorkouts(event: CustomEvent): void {
    const workouts = this.workouts();
    const newOrder = event.detail.complete(workouts);

    this.updateWorkoutsOrder(newOrder);
  }

  private async updateWorkoutsOrder(workouts: WorkoutDetail[]): Promise<void> {
    await this.workoutsFacade.reorderWorkouts(
      workouts.map((workout) => workout.id),
    );
  }
}
