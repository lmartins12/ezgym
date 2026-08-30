import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import {
  add,
  addOutline,
  barbellOutline,
  settingsOutline,
} from 'ionicons/icons';
import { WorkoutCardComponent } from '../components/workout-card/workout-card.component';
import {
  WorkoutFormModalComponent,
  type WorkoutFormResult,
} from '../components/workout-form-modal/workout-form-modal.component';
import type { WorkoutDetail } from '../models/workout-detail.model';
import { WorkoutsService } from '../services/workouts.service';

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
  private readonly workoutsService = inject(WorkoutsService);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly modalCtrl = inject(ModalController);

  public readonly workouts = signal<WorkoutDetail[]>([]);
  public readonly loading = signal(false);

  constructor() {
    addIcons({
      add,
      addOutline,
      settingsOutline,
      barbellOutline,
    });
  }

  public ionViewWillEnter(): void {
    this.loadWorkouts();
  }

  public async loadWorkouts(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.workoutsService.getAll();
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

    const { data } = await modal.onWillDismiss<WorkoutFormResult>();

    if (data) {
      const id = await this.workoutsService.create(
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
            await this.workoutsService.delete(workoutId);
            await this.loadWorkouts();
          },
        },
      ],
    });

    await alert.present();
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
    for (let i = 0; i < workouts.length; i++) {
      await this.workoutsService.updateOrderIndex(workouts[i].id, i);
    }
  }
}
